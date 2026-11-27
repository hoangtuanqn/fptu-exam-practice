import type { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import type { Db } from "./wallet.repository";
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
  reward: true,
  user: { select: { fullName: true, email: true } },
  exam: { select: { title: true, threadId: true } },
} satisfies Prisma.ExplanationFeedbackSelect;

export const explanationFeedbackRepository = {
  find: (userId: string, examId: string, questionNumber: number) =>
    prisma.explanationFeedback.findUnique({ where: { userId_examId_questionNumber: { userId, examId, questionNumber } }, select: { helpful: true, reason: true, comment: true, updatedAt: true, resolvedAt: true } }),

  // Mỗi người một đánh giá cho mỗi câu: gửi lại thì ghi đè (lý do và góp ý cũ bị xóa nếu lần này là "hữu ích")
  upsert: (userId: string, examId: string, questionNumber: number, data: { helpful: boolean; reason: string | null; comment: string | null; resolvedAt?: null; resolvedById?: null; reward?: 0 }) =>
    prisma.explanationFeedback.upsert({
      where: { userId_examId_questionNumber: { userId, examId, questionNumber } },
      create: { userId, examId, questionNumber, ...data },
      // data có resolvedAt/resolvedById = null khi thành viên gửi lời chê mới: mở lại cho admin xem
      update: data,
      select: { helpful: true },
    }),

  // Danh sách cho admin, mới nhất trước. helpful: true = chỉ 👍, false = chỉ 👎, undefined = tất cả; resolved tương tự
  async listAdmin(query: PaginationQuery & { q?: string }, helpful?: boolean, resolved?: boolean) {
    const { q } = query;
    const where: Prisma.ExplanationFeedbackWhereInput = {
      helpful,
      resolvedAt: resolved === undefined ? undefined : resolved ? { not: null } : null,
      ...(q && { OR: [{ exam: { title: { contains: q } } }, { user: { email: { contains: q } } }, { comment: { contains: q } }] }),
    };
    const [items, total] = await Promise.all([
      prisma.explanationFeedback.findMany({ where, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], ...toSkipTake(query), select: adminSelect }),
      prisma.explanationFeedback.count({ where }),
    ]);
    return { items, total };
  },

  findAdmin: (id: string) => prisma.explanationFeedback.findUnique({ where: { id }, select: adminSelect }),

  // Chỉ ghi lần đầu: giải quyết lại giữ nguyên người và thời điểm đầu tiên
  resolve: (id: string, adminId: string) =>
    prisma.explanationFeedback.updateMany({ where: { id, resolvedAt: null }, data: { resolvedAt: new Date(), resolvedById: adminId } }),

  // Badge sidebar: lời chê chưa giải quyết, dùng index (helpful, resolved_at, updated_at)
  countPending: () => prisma.explanationFeedback.count({ where: { helpful: false, resolvedAt: null } }),

  // Nội dung lời giải đang lưu của các câu trong trang, để admin đọc ngay lời giải bị chê
  explanationsOf: (pairs: { examId: string; questionNumber: number }[]) =>
    pairs.length === 0 ? Promise.resolve([]) : prisma.questionExplanation.findMany({ where: { OR: pairs }, select: { examId: true, questionNumber: true, content: true, model: true, createdAt: true } }),

  // ----- Xác nhận 👎 đúng (gọi trong một transaction)
  findForConfirm: (db: Db, id: string) =>
    db.explanationFeedback.findUnique({ where: { id }, select: { userId: true, examId: true, questionNumber: true, helpful: true, updatedAt: true, resolvedAt: true, exam: { select: { title: true } } } }),

  // Cổng một người thắng: xóa đúng bản lời giải bị chê (tạo trước lần góp ý cuối). Hai giao dịch cùng câu xếp hàng ở khóa dòng này; false = đã tạo lại hoặc đã xóa
  claimExplanation: async (db: Db, examId: string, questionNumber: number, ratedAt: Date) =>
    (await db.questionExplanation.deleteMany({ where: { examId, questionNumber, createdAt: { lte: ratedAt } } })).count === 1,

  // Chốt góp ý bằng UPDATE có điều kiện (còn là 👎 đang mở)
  settle: async (db: Db, id: string, adminId: string, reward: number) =>
    (await db.explanationFeedback.updateMany({ where: { id, helpful: false, resolvedAt: null }, data: { resolvedAt: new Date(), resolvedById: adminId, reward } })).count === 1,

  // Các 👎 đang mở khác của cùng câu: lời giải đã thưởng một lần, đóng không thưởng (index exam_id, question_number)
  closeOthers: (db: Db, examId: string, questionNumber: number, adminId: string) =>
    db.explanationFeedback.updateMany({ where: { examId, questionNumber, helpful: false, resolvedAt: null }, data: { resolvedAt: new Date(), resolvedById: adminId } }),

  async summary() {
    const rows = await prisma.explanationFeedback.groupBy({ by: ["helpful"], _count: { _all: true } });
    const count = (h: boolean) => rows.find((r) => r.helpful === h)?._count._all ?? 0;
    return { up: count(true), down: count(false) };
  },
};
