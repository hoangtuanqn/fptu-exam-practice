import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { USABLE_ANSWER_SOURCES } from "../constants/exam";
import { CHAPTER_STATS_MAX_ROWS, HOT_QUESTIONS_MIN_EXAMS, STATS_TX_TIMEOUT_MS } from "../constants/frequency-stats";

// Thống kê tần suất ra đề tính bằng SQL (MySQL 8). Công thức giống hệt utils/frequency-stats (có test so khớp hai bên).

export interface RefreshParams {
  subjectId: number;
  subjectCode: string;
  halfLifeDays: number;
  mediumExams: number;
  highExams: number;
  now: Date;
}

/**
 * Các CTE dùng chung:
 * - usable: đề dùng được của môn và ngày của đề (posted_at, chưa biết thì lấy ngày nhập vào hệ thống)
 * - weighted: trọng số mỗi đề = 0.5 ^ (tuổi / chu kỳ bán rã), tuổi tính bằng ngày LÙI TỪ ĐỀ MỚI NHẤT của môn
 *   (không phụ thuộc giờ chạy lệnh, nên chạy lại cùng dữ liệu cho cùng số)
 * - totals: tổng số đề và tổng trọng số của môn
 */
const baseCtes = (p: RefreshParams) => Prisma.sql`
  usable AS (
    SELECT e.id, COALESCE(e.posted_at, e.created_at) AS exam_at
    FROM exams e
    WHERE e.subject_code = ${p.subjectCode} AND e.answer_source IN (${Prisma.join([...USABLE_ANSWER_SOURCES])})
  ),
  weighted AS (
    SELECT u.id, u.exam_at,
           POW(0.5, TIMESTAMPDIFF(SECOND, u.exam_at, MAX(u.exam_at) OVER ()) / 86400 / ${p.halfLifeDays}) AS w
    FROM usable u
  ),
  totals AS (
    SELECT COUNT(*) AS total_exams, SUM(w) AS total_w FROM weighted
  )`;

// Độ tin cậy theo tổng số đề của môn (ngưỡng lấy từ constants/frequency-stats)
const confidenceSql = (p: RefreshParams) => Prisma.sql`CASE WHEN t.total_exams >= ${p.highExams} THEN 'high' WHEN t.total_exams >= ${p.mediumExams} THEN 'medium' ELSE 'low' END`;

/** Một dòng mỗi chương (ExamQuestion.topic) của môn. Câu chưa gắn chương không tính vào chương nào. */
const insertChapterStats = (p: RefreshParams) => Prisma.sql`
  INSERT INTO chapter_stats
    (subject_id, chapter, question_count, exams_with_chapter, total_exams, avg_questions_per_exam, recency_score, confidence, last_seen_at, computed_at)
  WITH ${baseCtes(p)},
  -- Mỗi cặp (đề, chương) kèm số câu của chương trong đề đó
  exam_chapter AS (
    SELECT q.exam_id, q.topic AS chapter, COUNT(*) AS n
    FROM exam_questions q
    JOIN usable u ON u.id = q.exam_id
    WHERE q.is_reference = 0 AND q.topic IS NOT NULL
    GROUP BY q.exam_id, q.topic
  )
  SELECT ${p.subjectId},
         ec.chapter,
         SUM(ec.n),                      -- tổng số câu của chương qua mọi đề
         COUNT(*),                       -- số đề có ít nhất một câu của chương
         t.total_exams,
         SUM(ec.n) / t.total_exams,      -- trung bình số câu của chương trên MỖI đề của môn
         SUM(w.w) / t.total_w,           -- tỉ lệ trọng số gần đây của các đề có chương, trong [0, 1]
         ${confidenceSql(p)},
         MAX(w.exam_at),
         ${p.now}
  FROM exam_chapter ec
  JOIN weighted w ON w.id = ec.exam_id
  CROSS JOIN totals t
  GROUP BY ec.chapter, t.total_exams, t.total_w`;

/** Một dòng mỗi nhóm câu của môn (nhóm do groups:build tạo). Chỉ đếm thành viên còn nằm trong đề dùng được. */
const insertGroupStats = (p: RefreshParams) => Prisma.sql`
  INSERT INTO question_group_stats
    (group_id, subject_id, chapter, exams_with_group, total_exams, last_seen_exam_id, last_seen_at, representative_question_id, recency_score, confidence, computed_at)
  WITH ${baseCtes(p)},
  -- Thành viên của từng nhóm, xếp hạng theo đề mới nhất (hạng 1 = bản ở đề mới nhất, dùng làm câu đại diện)
  member AS (
    SELECT m.group_id, m.question_id, q.exam_id, q.topic, w.exam_at, w.w,
           ROW_NUMBER() OVER (PARTITION BY m.group_id ORDER BY w.exam_at DESC, q.exam_id DESC, m.question_id DESC) AS newest_rank
    FROM question_group_members m
    JOIN exam_questions q ON q.id = m.question_id AND q.is_reference = 0
    JOIN weighted w ON w.id = q.exam_id
    WHERE m.subject_id = ${p.subjectId}
  ),
  -- Đếm theo đề khác nhau (nhóm dựng với allowSameExam có thể có hai câu cùng đề)
  group_exam AS (
    SELECT DISTINCT group_id, exam_id, w FROM member
  ),
  per_group AS (
    SELECT group_id, COUNT(*) AS exams_with_group, SUM(w) AS hit_w FROM group_exam GROUP BY group_id
  ),
  -- Chương của nhóm: chương của câu đại diện, chưa gắn thì lấy chương của thành viên khác
  group_chapter AS (
    SELECT group_id, MAX(topic) AS any_topic FROM member GROUP BY group_id
  )
  SELECT g.group_id,
         ${p.subjectId},
         COALESCE(n.topic, gc.any_topic),
         g.exams_with_group,
         t.total_exams,
         n.exam_id,
         n.exam_at,
         n.question_id,
         g.hit_w / t.total_w,
         ${confidenceSql(p)},
         ${p.now}
  FROM per_group g
  JOIN member n ON n.group_id = g.group_id AND n.newest_rank = 1
  JOIN group_chapter gc ON gc.group_id = g.group_id
  CROSS JOIN totals t`;

export const frequencyStatsRepository = {
  /** Tính lại thống kê của một môn trong MỘT giao dịch: xoá số cũ rồi ghi số mới (chạy lại bao nhiêu lần cũng ra cùng kết quả). */
  refreshSubject: (p: RefreshParams) =>
    prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`DELETE FROM chapter_stats WHERE subject_id = ${p.subjectId}`;
        const chapters = await tx.$executeRaw(insertChapterStats(p));
        await tx.$executeRaw`DELETE FROM question_group_stats WHERE subject_id = ${p.subjectId}`;
        const groups = await tx.$executeRaw(insertGroupStats(p));
        return { chapters, groups };
      },
      { timeout: STATS_TX_TIMEOUT_MS },
    ),

  chapterStats: (subjectId: number) =>
    prisma.chapterStat.findMany({
      where: { subjectId },
      orderBy: [{ examsWithChapter: "desc" }, { recencyScore: "desc" }, { chapter: "asc" }],
      take: CHAPTER_STATS_MAX_ROWS,
    }),

  /** Nhóm câu ra ở ít nhất HOT_QUESTIONS_MIN_EXAMS đề, nhiều đề nhất trước, bằng nhau thì gần đây hơn trước. */
  hotGroups: (subjectId: number, take: number) =>
    prisma.questionGroupStat.findMany({
      where: { subjectId, examsWithGroup: { gte: HOT_QUESTIONS_MIN_EXAMS } },
      orderBy: [{ examsWithGroup: "desc" }, { recencyScore: "desc" }, { groupId: "asc" }],
      take,
    }),

  countHotGroups: (subjectId: number) => prisma.questionGroupStat.count({ where: { subjectId, examsWithGroup: { gte: HOT_QUESTIONS_MIN_EXAMS } } }),

  questionsByIds: (ids: number[]) =>
    ids.length
      ? prisma.examQuestion.findMany({ where: { id: { in: ids } }, select: { id: true, examId: true, number: true, imagePath: true, exam: { select: { title: true, threadId: true } } } })
      : Promise.resolve([]),
};
