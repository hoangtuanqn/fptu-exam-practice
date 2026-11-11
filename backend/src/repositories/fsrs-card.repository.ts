import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { USABLE_ANSWER_SOURCES } from "../constants/exam";
import { FSRS_TX_RETRIES } from "../constants/fsrs";
import type { StoredCard } from "../utils/fsrs";

export interface ReviewLogRow {
  rating: number;
  state: number;
  due: Date;
  stability: number;
  difficulty: number;
  elapsedDays: number;
  lastElapsedDays: number;
  scheduledDays: number;
  learningSteps: number;
  reviewedAt: Date;
}

interface LockedCardRow {
  id: number;
  due: Date;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: Date | null;
}

const toStored = (r: LockedCardRow): StoredCard => ({
  due: r.due,
  stability: Number(r.stability),
  difficulty: Number(r.difficulty),
  elapsedDays: Number(r.elapsed_days),
  scheduledDays: Number(r.scheduled_days),
  learningSteps: Number(r.learning_steps),
  reps: Number(r.reps),
  lapses: Number(r.lapses),
  state: Number(r.state),
  lastReview: r.last_review,
});

// Xung đột ghi/deadlock (P2034, hoặc lỗi MySQL 1213/1205 trong câu SQL thô P2010) hay trùng khoá (P2002) khi nhiều lần ôn cùng lúc: chạy lại cả giao dịch
const MYSQL_RETRYABLE = new Set(["1213", "1205"]);
const isRetryable = (err: unknown) => {
  if (!(err instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (err.code === "P2034" || err.code === "P2002") return true;
  return err.code === "P2010" && MYSQL_RETRYABLE.has(String((err.meta as { code?: unknown } | undefined)?.code ?? ""));
};

// Câu ôn được khi đề còn dùng được và (trừ admin) đề còn trong kho của người dùng
const visibleQuestion = (userId: number, isAdmin: boolean) => ({
  isReference: false,
  exam: { answerSource: { in: [...USABLE_ANSWER_SOURCES] }, ...(isAdmin ? {} : { userExams: { some: { userId } } }) },
});

export const fsrsCardRepository = {
  findQuestion: (id: number) => prisma.examQuestion.findUnique({ where: { id }, select: { id: true, examId: true, isReference: true, exam: { select: { answerSource: true } } } }),

  /**
   * Một lần ôn trong MỘT giao dịch, an toàn khi gửi trùng/song song:
   * INSERT IGNORE thẻ mới (nếu chưa có) -> SELECT ... FOR UPDATE khoá đúng dòng thẻ -> `schedule` tính từ dòng đã khoá -> UPDATE thẻ + ghi nhật ký.
   * Lần ôn thứ hai cùng lúc phải chờ lần đầu xong nên tính tiếp từ kết quả của lần đầu. Deadlock hiếm gặp thì chạy lại vài lần.
   */
  async review<T>(userId: number, questionId: number, empty: StoredCard, schedule: (current: StoredCard) => { card: StoredCard; log: ReviewLogRow; result: T }): Promise<T> {
    for (let attempt = 0; ; attempt++) {
      try {
        return await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`
            INSERT IGNORE INTO user_question_cards
              (user_id, question_id, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review, updated_at)
            VALUES (${userId}, ${questionId}, ${empty.due}, ${empty.stability}, ${empty.difficulty}, ${empty.elapsedDays}, ${empty.scheduledDays},
                    ${empty.learningSteps}, ${empty.reps}, ${empty.lapses}, ${empty.state}, ${empty.lastReview}, NOW(3))`;
          const [row] = await tx.$queryRaw<LockedCardRow[]>`
            SELECT id, due, stability, difficulty, elapsed_days, scheduled_days, learning_steps, reps, lapses, state, last_review
            FROM user_question_cards WHERE user_id = ${userId} AND question_id = ${questionId} FOR UPDATE`;
          if (!row) throw new Error("FSRS card row missing after insert");
          const { card, log, result } = schedule(toStored(row));
          await tx.userQuestionCard.update({ where: { id: row.id }, data: card });
          await tx.userReviewLog.create({ data: { userId, questionId, ...log } });
          return result;
        });
      } catch (err) {
        if (attempt >= FSRS_TX_RETRIES || !isRetryable(err)) throw err;
      }
    }
  },

  /** Thẻ đến hạn (due <= now), sớm nhất trước; chỉ câu của đề còn dùng được và còn trong kho của người dùng (admin: mọi đề). */
  due: (userId: number, isAdmin: boolean, now: Date, take: number) =>
    prisma.userQuestionCard.findMany({
      where: { userId, due: { lte: now }, question: visibleQuestion(userId, isAdmin) },
      orderBy: [{ due: "asc" }, { id: "asc" }],
      take,
      select: {
        questionId: true,
        due: true,
        state: true,
        reps: true,
        lapses: true,
        question: { select: { examId: true, number: true, imagePath: true, topic: true, exam: { select: { title: true, threadId: true } } } },
      },
    }),

  countDue: (userId: number, isAdmin: boolean, now: Date) => prisma.userQuestionCard.count({ where: { userId, due: { lte: now }, question: visibleQuestion(userId, isAdmin) } }),
};
