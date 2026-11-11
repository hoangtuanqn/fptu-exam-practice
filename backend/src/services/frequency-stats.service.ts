import { FREQUENT_FREE_LIMIT } from "../constants/frequent";
import { STATS_CONFIDENCE_HIGH_EXAMS, STATS_CONFIDENCE_MEDIUM_EXAMS, STATS_RECENCY_HALF_LIFE_DAYS } from "../constants/frequency-stats";
import { PRO_BENEFITS } from "../constants/plan";
import { frequencyStatsRepository } from "../repositories/frequency-stats.repository";
import { subjectRepository, type SubjectRef } from "../repositories/subject.repository";
import { AppError } from "../rules/error";
import { fileUrlOf } from "../utils/file-url";
import { assertHalfLife } from "../utils/frequency-stats";
import { isProUser } from "../utils/pro";

// Thống kê tần suất ra đề (số liệu quá khứ): theo chương và theo nhóm câu giống nhau. Tính lại bằng npm run stats:refresh.

export interface RefreshOptions {
  halfLifeDays?: number;
  now?: Date; // giờ ghi vào computed_at (test truyền giờ cố định)
}

async function subjectOrThrow(subjectId: number) {
  const subject = await subjectRepository.findById(subjectId);
  if (!subject) throw AppError.notFound("Không tìm thấy môn học");
  return subject;
}

export const frequencyStatsService = {
  /** Tính lại thống kê của một môn trong một giao dịch. Chạy sau groups:build để có số liệu nhóm mới. */
  refresh(subject: SubjectRef, { halfLifeDays = STATS_RECENCY_HALF_LIFE_DAYS, now = new Date() }: RefreshOptions = {}) {
    assertHalfLife(halfLifeDays);
    return frequencyStatsRepository.refreshSubject({
      subjectId: subject.id,
      subjectCode: subject.code,
      halfLifeDays,
      mediumExams: STATS_CONFIDENCE_MEDIUM_EXAMS,
      highExams: STATS_CONFIDENCE_HIGH_EXAMS,
      now,
    });
  },

  /** Thống kê theo chương của môn (công khai). */
  async chapterStats(subjectId: number) {
    const subject = await subjectOrThrow(subjectId);
    const rows = await frequencyStatsRepository.chapterStats(subject.id);
    return {
      subjectId: subject.id,
      subject: subject.code,
      totalExams: rows[0]?.totalExams ?? 0,
      computedAt: rows[0]?.computedAt ?? null,
      items: rows.map((r) => ({
        chapter: r.chapter,
        questionCount: r.questionCount,
        examsWithChapter: r.examsWithChapter,
        totalExams: r.totalExams,
        avgQuestionsPerExam: r.avgQuestionsPerExam,
        recencyScore: r.recencyScore,
        confidence: r.confidence,
        lastSeenAt: r.lastSeenAt,
      })),
    };
  },

  /** Nhóm câu ra lại nhiều đề nhất. Gói thường chỉ nhận FREQUENT_FREE_LIMIT nhóm đầu (khoá ở máy chủ, giống "Câu hay ra"). */
  async hotQuestions(subjectId: number, limit: number, user: unknown) {
    const subject = await subjectOrThrow(subjectId);
    const pro = PRO_BENEFITS.frequentQuestions && isProUser(user);
    const take = pro ? limit : Math.min(limit, FREQUENT_FREE_LIMIT);
    const [total, groups] = await Promise.all([frequencyStatsRepository.countHotGroups(subject.id), frequencyStatsRepository.hotGroups(subject.id, take)]);
    const questions = new Map((await frequencyStatsRepository.questionsByIds(groups.flatMap((g) => (g.representativeQuestionId ? [g.representativeQuestionId] : [])))).map((q) => [q.id, q]));

    const items = groups.flatMap((g) => {
      const q = g.representativeQuestionId ? questions.get(g.representativeQuestionId) : undefined;
      if (!q) return []; // câu đại diện đã bị xoá sau lần tính gần nhất
      return [
        {
          groupId: g.groupId,
          examsWithGroup: g.examsWithGroup,
          totalExams: g.totalExams,
          recencyScore: g.recencyScore,
          confidence: g.confidence,
          chapter: g.chapter,
          lastSeenAt: g.lastSeenAt,
          question: { id: q.id, examId: q.examId, examTitle: q.exam.title, threadId: q.exam.threadId, number: q.number, imageUrl: fileUrlOf(q.imagePath) },
        },
      ];
    });
    const shownLimit = pro ? total : Math.min(total, FREQUENT_FREE_LIMIT);
    return {
      subjectId: subject.id,
      subject: subject.code,
      total,
      locked: !pro && total > shownLimit,
      hidden: Math.max(0, total - shownLimit),
      items,
    };
  },
};
