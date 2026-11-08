import type { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { REVIEW_FREE_LIMIT, REVIEW_SESSION_SIZE } from "../constants/review";
import { AppError } from "../rules/error";
import { fileUrlOf } from "../utils/file-url";
import { toMeta, toSkipTake, type PaginationQuery } from "../utils/pagination";
import { afterCorrect, afterWrong, doubtfulStart, sameAnswers } from "../utils/review-schedule";
import type { GradedQuestion } from "./grading.service";
import { studyService } from "./study.service";

// Chỉ ôn những câu của đề đã có đáp án chắc chắn (AI giải xong hoặc chỉnh tay); đề đang chờ AI hay lỗi thì chưa chấm được
const USABLE_EXAM = { answerSource: { in: ["AI", "MANUAL"] } } satisfies Prisma.ExamWhereInput;

const answersOf = (answer: string) => answer.split(/\s+/).filter(Boolean);

// Lấy ảnh và đáp án hiện tại của các câu (đáp án có thể đã được sửa sau lúc làm sai nên luôn lấy bản mới nhất)
async function questionsOf(items: { examId: number; questionNumber: number }[]) {
  if (items.length === 0) return new Map<string, { imagePath: string; answer: string }>();
  const rows = await prisma.examQuestion.findMany({
    where: { isReference: false, OR: items.map((i) => ({ examId: i.examId, number: i.questionNumber })) },
    select: { examId: true, number: true, imagePath: true, answer: true },
  });
  return new Map(rows.map((q) => [`${q.examId}:${q.number}`, q]));
}

export const reviewService = {
  /**
   * Gọi sau khi nộp bài. Sai/bỏ qua -> vào sổ (hoặc về hộp 1); đúng ở câu đã có trong sổ và đến hạn -> lên hộp;
   * đúng nhưng đã đánh dấu phân vân -> vào sổ ở hộp 2. Thành viên thường bị giới hạn số câu đang ôn.
   * Trả về số câu mới vào sổ và số câu không vào được vì hết chỗ.
   */
  async recordAttempt(userId: number, examId: number, items: GradedQuestion[], flagged: number[], isPro: boolean) {
    const now = new Date();
    const flaggedSet = new Set(flagged);
    const wrong = items.filter((i) => i.outcome === "wrong" || i.outcome === "skipped").map((i) => i.number);
    const doubtful = items.filter((i) => i.outcome === "correct" && flaggedSet.has(i.number)).map((i) => i.number);
    const correct = items.filter((i) => i.outcome === "correct").map((i) => i.number);
    if (wrong.length === 0 && correct.length === 0) return { added: 0, capped: 0 };

    const existing = await prisma.reviewItem.findMany({ where: { userId, examId, questionNumber: { in: [...wrong, ...correct] } } });
    const byNumber = new Map(existing.map((e) => [e.questionNumber, e]));
    let room = Infinity;
    if (!isPro) room = Math.max(0, REVIEW_FREE_LIMIT - (await prisma.reviewItem.count({ where: { userId, mastered: false } })));

    let added = 0;
    let capped = 0;
    const toCreate: Prisma.ReviewItemCreateManyInput[] = [];
    const resetIds: number[] = [];
    const advance: { id: number; box: number }[] = [];

    for (const number of wrong) {
      const e = byNumber.get(number);
      if (e) {
        if (e.mastered) {
          // đã tốt nghiệp, giờ sai lại: cần chỗ trống mới vào lại sổ
          if (room <= 0) {
            capped++;
            continue;
          }
          room--;
          added++;
        }
        resetIds.push(e.id);
      } else if (room > 0) {
        room--;
        added++;
        toCreate.push({ userId, examId, questionNumber: number, ...afterWrong(now) });
      } else capped++;
    }
    for (const number of doubtful) {
      if (byNumber.has(number)) continue;
      if (room <= 0) {
        capped++;
        continue;
      }
      room--;
      added++;
      toCreate.push({ userId, examId, questionNumber: number, wrongCount: 0, doubtful: true, ...doubtfulStart(now) });
    }
    for (const number of correct) {
      const e = byNumber.get(number);
      // chỉ tính khi đã đến hạn: làm lại đề trong cùng ngày không làm tăng hộp
      if (e && !e.mastered && e.nextReviewAt <= now) advance.push({ id: e.id, box: e.box });
    }

    const ops: Prisma.PrismaPromise<unknown>[] = [];
    if (toCreate.length) ops.push(prisma.reviewItem.createMany({ data: toCreate, skipDuplicates: true }));
    if (resetIds.length) ops.push(prisma.reviewItem.updateMany({ where: { id: { in: resetIds }, userId }, data: { ...afterWrong(now), wrongCount: { increment: 1 }, doubtful: false } }));
    for (const a of advance) ops.push(prisma.reviewItem.update({ where: { id: a.id }, data: { ...afterCorrect(a.box, now), lastReviewedAt: now } }));
    if (ops.length) await prisma.$transaction(ops);
    return { added, capped };
  },

  /** Tổng quan sổ câu sai: số câu cần ôn hôm nay, đang ôn, đã nhớ, giới hạn gói thường */
  async summary(userId: number, isPro: boolean) {
    const now = new Date();
    const active = { userId, mastered: false, exam: USABLE_EXAM };
    const [due, total, mastered, next] = await Promise.all([
      prisma.reviewItem.count({ where: { ...active, nextReviewAt: { lte: now } } }),
      prisma.reviewItem.count({ where: { userId, mastered: false } }),
      prisma.reviewItem.count({ where: { userId, mastered: true } }),
      prisma.reviewItem.findFirst({ where: { ...active, nextReviewAt: { gt: now } }, orderBy: { nextReviewAt: "asc" }, select: { nextReviewAt: true } }),
    ]);
    return { due, total, mastered, limit: isPro ? null : REVIEW_FREE_LIMIT, nextDueAt: next?.nextReviewAt ?? null };
  },

  /** Các câu để ôn trong một lượt: mặc định chỉ câu đến hạn (quá hạn lâu nhất trước); `all` = ôn thêm cả câu chưa đến hạn */
  async queue(userId: number, all: boolean, limit = REVIEW_SESSION_SIZE) {
    const now = new Date();
    const rows = await prisma.reviewItem.findMany({
      where: { userId, mastered: false, exam: USABLE_EXAM, ...(all ? {} : { nextReviewAt: { lte: now } }) },
      orderBy: [{ nextReviewAt: "asc" }, { id: "asc" }],
      take: limit,
      include: { exam: { select: { title: true, threadId: true } } },
    });
    const qs = await questionsOf(rows);
    return rows.flatMap((r) => {
      const q = qs.get(`${r.examId}:${r.questionNumber}`);
      if (!q) return []; // câu đã bị xoá hoặc chuyển thành tài liệu tham khảo
      return [
        {
          id: r.id,
          examId: r.examId,
          examTitle: r.exam.title,
          threadId: r.exam.threadId,
          number: r.questionNumber,
          imageUrl: fileUrlOf(q.imagePath),
          correct: answersOf(q.answer),
          box: r.box,
          wrongCount: r.wrongCount,
          doubtful: r.doubtful,
        },
      ];
    });
  },

  /** Nộp đáp án một câu ôn. Chấm ở server theo đáp án hiện tại rồi xếp lịch ôn kế tiếp */
  async answer(userId: number, id: number, chosen: string[]) {
    const item = await prisma.reviewItem.findFirst({ where: { id, userId } });
    if (!item) throw AppError.notFound("Câu này không còn trong sổ");
    const q = await prisma.examQuestion.findUnique({ where: { examId_number: { examId: item.examId, number: item.questionNumber } }, select: { answer: true } });
    if (!q) throw AppError.notFound("Câu này không còn trong đề");
    const correctAnswers = answersOf(q.answer);
    const correct = sameAnswers(chosen, correctAnswers);
    const now = new Date();
    const due = item.nextReviewAt <= now;

    let data: Prisma.ReviewItemUpdateInput;
    if (!correct) data = { ...afterWrong(now), wrongCount: { increment: 1 }, doubtful: false, lastReviewedAt: now };
    else if (due) data = { ...afterCorrect(item.box, now), lastReviewedAt: now };
    else data = { lastReviewedAt: now }; // đúng nhưng chưa đến hạn (ôn thêm): giữ nguyên lịch
    const updated = await prisma.reviewItem.update({ where: { id }, data });
    await studyService.bump(userId, { reviews: 1 }).catch(() => undefined);
    return { correct, correctAnswers, box: updated.box, mastered: updated.mastered, nextReviewAt: updated.nextReviewAt };
  },

  /** Danh sách trong trang Sổ câu sai: câu đang ôn (đến hạn trước) hoặc câu đã nhớ */
  async list(userId: number, query: PaginationQuery, status: "active" | "mastered") {
    const where: Prisma.ReviewItemWhereInput = { userId, mastered: status === "mastered" };
    const [rows, total] = await Promise.all([
      prisma.reviewItem.findMany({
        where,
        orderBy: status === "active" ? [{ nextReviewAt: "asc" }, { id: "asc" }] : [{ updatedAt: "desc" }],
        ...toSkipTake(query),
        include: { exam: { select: { title: true, threadId: true } } },
      }),
      prisma.reviewItem.count({ where }),
    ]);
    const qs = await questionsOf(rows);
    const now = Date.now();
    const items = rows.map((r) => {
      const q = qs.get(`${r.examId}:${r.questionNumber}`);
      return {
        id: r.id,
        examId: r.examId,
        examTitle: r.exam.title,
        threadId: r.exam.threadId,
        number: r.questionNumber,
        imageUrl: q ? fileUrlOf(q.imagePath) : null,
        box: r.box,
        wrongCount: r.wrongCount,
        doubtful: r.doubtful,
        mastered: r.mastered,
        nextReviewAt: r.nextReviewAt,
        due: !r.mastered && r.nextReviewAt.getTime() <= now,
      };
    });
    return { items, meta: toMeta(query, total) };
  },

  /** Bỏ một câu khỏi sổ ("mình nhớ rồi") */
  async remove(userId: number, id: number) {
    const r = await prisma.reviewItem.deleteMany({ where: { id, userId } });
    if (r.count === 0) throw AppError.notFound("Câu này không còn trong sổ");
  },
};
