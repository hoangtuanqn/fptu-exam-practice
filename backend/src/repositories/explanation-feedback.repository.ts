import type { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";

export const explanationFeedbackRepository = {
  find: (userId: number, examId: number, questionNumber: number) =>
    prisma.explanationFeedback.findUnique({ where: { userId_examId_questionNumber: { userId, examId, questionNumber } }, select: { helpful: true, reason: true } }),

  // Mỗi người một đánh giá cho mỗi câu: gửi lại thì ghi đè (lý do và góp ý cũ bị xóa nếu lần này là "hữu ích")
  upsert: (userId: number, examId: number, questionNumber: number, data: { helpful: boolean; reason: string | null; comment: string | null }) =>
    prisma.explanationFeedback.upsert({
      where: { userId_examId_questionNumber: { userId, examId, questionNumber } },
      create: { userId, examId, questionNumber, ...data },
      update: data,
      select: { helpful: true },
    }),

  // Danh sách cho admin, mới nhất trước. helpful: true = chỉ 👍, false = chỉ 👎, undefined = tất cả
  async listAdmin(query: PaginationQuery, helpful?: boolean) {
    const where: Prisma.ExplanationFeedbackWhereInput = { helpful };
    const [items, total] = await Promise.all([
      prisma.explanationFeedback.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        ...toSkipTake(query),
        select: {
          id: true,
          examId: true,
          questionNumber: true,
          helpful: true,
          reason: true,
          comment: true,
          updatedAt: true,
          user: { select: { fullName: true, email: true } },
          exam: { select: { title: true, threadId: true } },
        },
      }),
      prisma.explanationFeedback.count({ where }),
    ]);
    return { items, total };
  },

  // Nội dung lời giải đang lưu của các câu trong trang, để admin đọc ngay lời giải bị chê
  explanationsOf: (pairs: { examId: number; questionNumber: number }[]) =>
    pairs.length === 0 ? Promise.resolve([]) : prisma.questionExplanation.findMany({ where: { OR: pairs }, select: { examId: true, questionNumber: true, content: true, model: true } }),

  async summary() {
    const rows = await prisma.explanationFeedback.groupBy({ by: ["helpful"], _count: { _all: true } });
    const count = (h: boolean) => rows.find((r) => r.helpful === h)?._count._all ?? 0;
    return { up: count(true), down: count(false) };
  },
};
