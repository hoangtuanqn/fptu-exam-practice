import type { Prisma, ReportStatus } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";
import type { Db } from "./wallet.repository";

export const answerReportRepository = {
  create: (data: { examId: number; questionNumber: number; userId: number; currentAnswer: string; proposedAnswer: string; reason: string }) =>
    prisma.answerReport.create({ data, select: { id: true } }),

  countSince: (userId: number, since: Date) => prisma.answerReport.count({ where: { userId, createdAt: { gte: since } } }),

  findPending: (db: Db, id: number) =>
    db.answerReport.findFirst({
      where: { id, status: "PENDING" },
      select: { id: true, examId: true, questionNumber: true, userId: true, proposedAnswer: true, exam: { select: { title: true } } },
    }),

  /** Chốt báo cáo bằng UPDATE có điều kiện (chỉ khi còn PENDING): hai admin duyệt cùng lúc thì chỉ một người thắng. */
  async review(db: Db, id: number, data: { status: Exclude<ReportStatus, "PENDING">; reward: number; reviewNote?: string; reviewedById: number }) {
    const { count } = await db.answerReport.updateMany({
      where: { id, status: "PENDING" },
      data: { ...data, reviewedAt: new Date() },
    });
    return count === 1;
  },

  // Admin: danh sách (chỉ các cột cần), người báo cáo kèm theo
  async listAdmin(query: PaginationQuery, status?: ReportStatus) {
    const where: Prisma.AnswerReportWhereInput = { status };
    const [items, total] = await Promise.all([
      prisma.answerReport.findMany({
        where,
        select: {
          id: true,
          examId: true,
          questionNumber: true,
          currentAnswer: true,
          proposedAnswer: true,
          reason: true,
          status: true,
          reward: true,
          reviewNote: true,
          createdAt: true,
          reviewedAt: true,
          exam: { select: { title: true, threadId: true } },
          user: { select: { id: true, email: true, fullName: true } },
        },
        orderBy: { id: "desc" },
        ...toSkipTake(query),
      }),
      prisma.answerReport.count({ where }),
    ]);
    return { items, total };
  },

  // Ảnh của các câu được báo cáo (một truy vấn cho cả trang, để admin xem đề khi duyệt)
  questionImages: (pairs: { examId: number; number: number }[]) =>
    pairs.length === 0
      ? Promise.resolve([])
      : prisma.examQuestion.findMany({
          where: { OR: pairs.map((p) => ({ examId: p.examId, number: p.number })) },
          select: { examId: true, number: true, imagePath: true },
        }),

  // Thành viên xem báo cáo của chính mình
  async listByUser(userId: number, query: PaginationQuery) {
    const where = { userId };
    const [items, total] = await Promise.all([
      prisma.answerReport.findMany({
        where,
        select: {
          id: true,
          questionNumber: true,
          proposedAnswer: true,
          status: true,
          reward: true,
          reviewNote: true,
          createdAt: true,
          exam: { select: { title: true, threadId: true } },
        },
        orderBy: { id: "desc" },
        ...toSkipTake(query),
      }),
      prisma.answerReport.count({ where }),
    ]);
    return { items, total };
  },
};
