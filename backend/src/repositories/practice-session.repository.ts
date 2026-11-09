import type { AttemptMode, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import type { Owner } from "../utils/actor";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";

const whereOf = (owner: Owner) => ("userId" in owner ? { userId: owner.userId } : { guestId: owner.guestId });

const withExam = { exam: { select: { id: true, title: true, threadId: true, totalQuestions: true } } } satisfies Prisma.PracticeSessionInclude;

export interface SessionState {
  answers: Prisma.InputJsonValue;
  checked: Prisma.InputJsonValue;
  flagged: Prisma.InputJsonValue;
  current: number;
  elapsedSec: number;
}

export const practiceSessionRepository = {
  create: (owner: Owner, examId: number, mode: AttemptMode) =>
    prisma.practiceSession.create({ data: { ...whereOf(owner), examId, mode, answers: {}, checked: {}, flagged: {} }, include: withExam }),

  findOfOwner: (owner: Owner, id: number) => prisma.practiceSession.findFirst({ where: { id, ...whereOf(owner) }, include: withExam }),

  // Lưu tiến độ bằng MỘT câu UPDATE có điều kiện (đúng chủ, còn đang làm). Trả số dòng đã ghi: 0 = không tồn tại, không phải của bạn, hoặc đã nộp.
  // Đây là đường nóng nhất của phần làm bài (tự lưu liên tục) nên không đọc trước rồi mới ghi.
  async saveIfOpen(owner: Owner, id: number, state: SessionState, submitted: boolean) {
    const { count } = await prisma.practiceSession.updateMany({
      where: { id, ...whereOf(owner), status: "IN_PROGRESS" },
      data: { ...state, ...(submitted && { status: "SUBMITTED" as const }) },
    });
    return count;
  },

  save: (id: number, state: SessionState, submitted: boolean) =>
    prisma.practiceSession.update({
      where: { id },
      data: { ...state, ...(submitted && { status: "SUBMITTED" as const }) },
      select: { id: true, status: true, updatedAt: true },
    }),

  // Các lần làm dở (chưa nộp), mới cập nhật lên đầu
  async listInProgress(owner: Owner, query: PaginationQuery, examId?: number, notBefore?: Date) {
    const where: Prisma.PracticeSessionWhereInput = { ...whereOf(owner), status: "IN_PROGRESS", examId, ...(notBefore && { updatedAt: { gte: notBefore } }) };
    const [items, total] = await Promise.all([
      prisma.practiceSession.findMany({ where, include: withExam, orderBy: { updatedAt: "desc" }, ...toSkipTake(query) }),
      prisma.practiceSession.count({ where }),
    ]);
    return { items, total };
  },

  remove: (id: number) => prisma.practiceSession.delete({ where: { id } }),

  // Dọn lượt cũ: lượt dở bỏ quên lâu ngày và lượt đã nộp (kết quả đã nằm trong lịch sử làm bài)
  async deleteStale(abandonedBefore: Date, submittedBefore: Date) {
    const { count } = await prisma.practiceSession.deleteMany({
      where: { OR: [{ status: "IN_PROGRESS", updatedAt: { lt: abandonedBefore } }, { status: "SUBMITTED", updatedAt: { lt: submittedBefore } }] },
    });
    return count;
  },
};
