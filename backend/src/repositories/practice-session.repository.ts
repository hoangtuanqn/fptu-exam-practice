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

  save: (id: number, state: SessionState, submitted: boolean) =>
    prisma.practiceSession.update({
      where: { id },
      data: { ...state, ...(submitted && { status: "SUBMITTED" as const }) },
      select: { id: true, status: true, updatedAt: true },
    }),

  // Các lần làm dở (chưa nộp), mới cập nhật lên đầu
  async listInProgress(owner: Owner, query: PaginationQuery, examId?: number) {
    const where: Prisma.PracticeSessionWhereInput = { ...whereOf(owner), status: "IN_PROGRESS", examId };
    const [items, total] = await Promise.all([
      prisma.practiceSession.findMany({ where, include: withExam, orderBy: { updatedAt: "desc" }, ...toSkipTake(query) }),
      prisma.practiceSession.count({ where }),
    ]);
    return { items, total };
  },

  remove: (id: number) => prisma.practiceSession.delete({ where: { id } }),
};
