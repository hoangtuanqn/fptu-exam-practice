import type { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";

const adminSelect = {
  id: true,
  examId: true,
  questionNumber: true,
  helpful: true,
  reason: true,
  comment: true,
  updatedAt: true,
  resolvedAt: true,
  resolvedById: true,
  user: { select: { fullName: true, email: true } },
  exam: { select: { title: true, threadId: true } },
} satisfies Prisma.ExplanationFeedbackSelect;

export const explanationFeedbackRepository = {
  find: (userId: number, examId: number, questionNumber: number) =>
    prisma.explanationFeedback.findUnique({ where: { userId_examId_questionNumber: { userId, examId, questionNumber } }, select: { helpful: true, reason: true, comment: true } }),

  // Mỗi người một đánh giá cho mỗi câu: gửi lại thì ghi đè (lý do và góp ý cũ bị xóa nếu lần này là "hữu ích")
  upsert: (userId: number, examId: number, questionNumber: number, data: { helpful: boolean; reason: string | null; comment: string | null; resolvedAt?: null; resolvedById?: null }) =>
    prisma.explanationFeedback.upsert({
      where: { userId_examId_questionNumber: { userId, examId, questionNumber } },
      create: { userId, examId, questionNumber, ...data },
      // data có resolvedAt/resolvedById = null khi thành viên gửi lời chê mới: mở lại cho admin xem
      update: data,
      select: { helpful: true },
    }),

  // Danh sách cho admin, mới nhất trước. helpful: true = chỉ 👍, false = chỉ 👎, undefined = tất cả; resolved tương tự
  async listAdmin(query: PaginationQuery, helpful?: boolean, resolved?: boolean) {
    const where: Prisma.ExplanationFeedbackWhereInput = { helpful, resolvedAt: resolved === undefined ? undefined : resolved ? { not: null } : null };
    const [items, total] = await Promise.all([
      prisma.explanationFeedback.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], ...toSkipTake(query), select: adminSelect }),
      prisma.explanationFeedback.count({ where }),
    ]);
    return { items, total };
  },

  findAdmin: (id: number) => prisma.explanationFeedback.findUnique({ where: { id }, select: adminSelect }),

  // Chỉ ghi lần đầu: giải quyết lại giữ nguyên người và thời điểm đầu tiên
  resolve: (id: number, adminId: number) =>
    prisma.explanationFeedback.updateMany({ where: { id, resolvedAt: null }, data: { resolvedAt: new Date(), resolvedById: adminId } }),

  // Badge sidebar: lời chê chưa giải quyết, dùng index (helpful, resolved_at, updated_at)
  countPending: () => prisma.explanationFeedback.count({ where: { helpful: false, resolvedAt: null } }),

  // Nội dung lời giải đang lưu của các câu trong trang, để admin đọc ngay lời giải bị chê
  explanationsOf: (pairs: { examId: number; questionNumber: number }[]) =>
    pairs.length === 0 ? Promise.resolve([]) : prisma.questionExplanation.findMany({ where: { OR: pairs }, select: { examId: true, questionNumber: true, content: true, model: true } }),

  async summary() {
    const rows = await prisma.explanationFeedback.groupBy({ by: ["helpful"], _count: { _all: true } });
    const count = (h: boolean) => rows.find((r) => r.helpful === h)?._count._all ?? 0;
    return { up: count(true), down: count(false) };
  },
};
