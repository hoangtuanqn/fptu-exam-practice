import type { AttemptMode, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { newestFirst, toSkipTake, type PaginationQuery } from "../utils/pagination";

export interface NewAttempt {
  userId: number;
  examId: number;
  mode: AttemptMode;
  score: number;
  totalGraded: number;
  correct: number;
  wrong: number;
  skipped: number;
  durationSec: number;
  details: Prisma.InputJsonValue;
}

const withExam = { exam: { select: { id: true, title: true, threadId: true, totalQuestions: true } } } satisfies Prisma.ExamAttemptInclude;

// Danh sách không cần cột details (nặng), chỉ chi tiết mới lấy
const listSelect = {
  id: true,
  examId: true,
  mode: true,
  score: true,
  totalGraded: true,
  correct: true,
  wrong: true,
  skipped: true,
  durationSec: true,
  createdAt: true,
  ...withExam,
} satisfies Prisma.ExamAttemptSelect;

export const examAttemptRepository = {
  create: (data: NewAttempt) => prisma.examAttempt.create({ data, select: listSelect }),

  findOfUser: (id: number, userId: number) =>
    prisma.examAttempt.findFirst({ where: { id, userId }, include: withExam }),

  async list(userId: number, query: PaginationQuery, examId?: number) {
    const where: Prisma.ExamAttemptWhereInput = { userId, examId };
    const [items, total] = await Promise.all([
      prisma.examAttempt.findMany({ where, select: listSelect, orderBy: [...newestFirst(true)], ...toSkipTake(query) }),
      prisma.examAttempt.count({ where }),
    ]);
    return { items, total };
  },

  // Số lần làm và điểm cao nhất của một đề (hiện ở màn làm bài)
  async summaryOfExam(userId: number, examId: number) {
    const r = await prisma.examAttempt.aggregate({ where: { userId, examId }, _count: { _all: true }, _max: { score: true } });
    return { attempts: r._count._all, bestScore: r._max.score };
  },

  // Số lần làm và điểm cao nhất theo từng đề, để hiện ở thư viện
  statsByExam: (userId: number, examIds: number[]) =>
    prisma.examAttempt.groupBy({
      by: ["examId"],
      where: { userId, examId: { in: examIds } },
      _count: { _all: true },
      _max: { score: true },
    }),
};
