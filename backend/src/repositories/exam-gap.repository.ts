import { type ExamKind, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import type { ExamGapFilter } from "../rules/requests/exam-upload.request";
import type { ExamGap } from "../utils/exam-upload";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";

export interface ExamGapRow {
  threadId: string;
  examId: string | null;
  title: string;
  subjectCode: string | null;
  kind: ExamKind | null;
  postedAt: Date | null;
  sourceUrl: string | null;
  totalQuestions: number;
  questions: number;
  answered: number;
  gap: ExamGap;
}

const containing = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

// shortcut: tìm theo tên là LIKE '%q%' (quét bảng, vài chục nghìn dòng vẫn nhanh); chậm thì thêm FULLTEXT trên title
const filters = (alias: "t" | "e", f: ExamGapFilter) => {
  const col = (name: string) => Prisma.raw(`${alias}.${name}`);
  return Prisma.sql`${f.kind ? Prisma.sql` AND ${col("kind")} = ${f.kind}` : Prisma.empty}${f.subject ? Prisma.sql` AND ${col("subject_code")} = ${f.subject}` : Prisma.empty}${
    f.q ? Prisma.sql` AND ${col("title")} LIKE ${containing(f.q)}` : Prisma.empty
  }`;
};

// Bài trong danh mục chưa có đề: NOT EXISTS dùng unique index exams.thread_id; lọc môn dùng index (subject_code, posted_at)
const missingExams = (f: ExamGapFilter) => Prisma.sql`
  SELECT t.thread_id AS threadId, NULL AS examId, t.title, t.subject_code AS subjectCode, t.kind, t.posted_at AS postedAt, NULL AS sourceUrl,
    0 AS totalQuestions, 0 AS questions, 0 AS answered, 'no_exam' AS gap
  FROM fuo_threads t
  WHERE NOT EXISTS (SELECT 1 FROM exams e WHERE e.thread_id = t.thread_id)${filters("t", f)}`;

/**
 * Đề còn thiếu ảnh hoặc đáp án. Điều kiện CASE là bản SQL của classifyExamGap (utils/exam-upload.ts): sửa một chỗ thì sửa cả hai.
 * Đếm câu bằng LATERAL theo từng đề (dùng unique index (exam_id, number)), không GROUP BY cả bảng exam_questions.
 */
const examsWithGaps = (f: ExamGapFilter, only: ExamGap | null) => Prisma.sql`
  SELECT g.threadId, g.examId, g.title, g.subjectCode, g.kind, g.postedAt, g.sourceUrl, g.totalQuestions, g.questions,
    IF(g.answerSource IN ('AI', 'MANUAL'), g.filled, 0) AS answered, g.gap
  FROM (
    SELECT s.*, CASE
        WHEN s.questions < s.totalQuestions OR (s.totalQuestions = 0 AND s.hasFiles = 0) THEN 'no_images'
        WHEN s.graded > 0 AND (s.answerSource NOT IN ('AI', 'MANUAL') OR s.filled < s.graded) THEN 'no_answers'
      END AS gap
    FROM (
      SELECT e.thread_id AS threadId, e.id AS examId, e.title, e.subject_code AS subjectCode, e.kind, e.posted_at AS postedAt,
        NULLIF(e.source_url, '') AS sourceUrl, e.total_questions AS totalQuestions, e.answer_source AS answerSource,
        c.questions, COALESCE(c.graded, 0) AS graded, COALESCE(c.filled, 0) AS filled,
        EXISTS (SELECT 1 FROM exam_attachments a WHERE a.exam_id = e.id) AS hasFiles
      FROM exams e
      CROSS JOIN LATERAL (
        SELECT COUNT(*) AS questions, SUM(q.is_reference = 0) AS graded, SUM(q.is_reference = 0 AND q.answer <> '') AS filled
        FROM exam_questions q WHERE q.exam_id = e.id
      ) c
      WHERE 1 = 1${filters("e", f)}
    ) s
  ) g
  WHERE ${only ? Prisma.sql`g.gap = ${only}` : Prisma.sql`g.gap IS NOT NULL`}`;

const num = (v: unknown) => Number(v ?? 0);

export const examGapRepository = {
  async list(gap: "all" | ExamGap, f: ExamGapFilter, page: PaginationQuery) {
    const parts: Prisma.Sql[] = [];
    if (gap === "all" || gap === "no_exam") parts.push(missingExams(f));
    if (gap !== "no_exam") parts.push(examsWithGaps(f, gap === "all" ? null : gap));
    const union = Prisma.join(
      parts.map((p) => Prisma.sql`(${p})`),
      " UNION ALL ",
    );
    const { skip, take } = toSkipTake(page);
    const [rows, count] = await Promise.all([
      prisma.$queryRaw<Record<string, unknown>[]>`SELECT * FROM (${union}) u ORDER BY u.postedAt IS NULL, u.postedAt DESC, u.threadId DESC LIMIT ${take} OFFSET ${skip}`,
      prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM (${union}) u`,
    ]);
    const items: ExamGapRow[] = rows.map((r) => ({
      threadId: String(r.threadId),
      examId: (r.examId as string | null) ?? null,
      title: String(r.title),
      subjectCode: (r.subjectCode as string | null) ?? null,
      kind: (r.kind as ExamKind | null) ?? null,
      postedAt: (r.postedAt as Date | null) ?? null,
      sourceUrl: (r.sourceUrl as string | null) ?? null,
      totalQuestions: num(r.totalQuestions),
      questions: num(r.questions),
      answered: num(r.answered),
      gap: r.gap as ExamGap,
    }));
    return { items, total: num(count[0]?.n) };
  },

  async summary(f: ExamGapFilter) {
    const [row] = await prisma.$queryRaw<{ noExam: bigint; noImages: unknown; noAnswers: unknown }[]>`
      SELECT (SELECT COUNT(*) FROM (${missingExams(f)}) m) AS noExam,
        COALESCE(SUM(x.gap = 'no_images'), 0) AS noImages, COALESCE(SUM(x.gap = 'no_answers'), 0) AS noAnswers
      FROM (${examsWithGaps(f, null)}) x`;
    return { noExam: num(row?.noExam), noImages: num(row?.noImages), noAnswers: num(row?.noAnswers) };
  },
};
