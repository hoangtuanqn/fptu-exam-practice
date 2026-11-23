import type { ContributionStatus, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { newestFirst, toSkipTake, type PaginationQuery } from "../utils/pagination";
import type { Db } from "./wallet.repository";

const mineSelect = {
  id: true,
  subjectCode: true,
  title: true,
  term: true,
  imageCount: true,
  status: true,
  reviewNote: true,
  createdAt: true,
} satisfies Prisma.ExamContributionSelect;

const adminSelect = {
  ...mineSelect,
  note: true,
  reviewedAt: true,
  user: { select: { id: true, email: true, fullName: true } },
} satisfies Prisma.ExamContributionSelect;

export const examContributionRepository = {
  create: (db: Db, data: { userId: string; subjectCode: string; title?: string; term?: string; note?: string; imageCount: number }) =>
    db.examContribution.create({ data, select: { id: true, status: true, imageCount: true } }),

  // Dùng index (user_id, created_at); mỗi người chỉ có ít dòng
  countPendingByUser: (db: Db, userId: string) => db.examContribution.count({ where: { userId, status: "PENDING" } }),

  async listByUser(userId: string, query: PaginationQuery) {
    const where = { userId };
    const [items, total] = await Promise.all([
      prisma.examContribution.findMany({ where, select: mineSelect, orderBy: [...newestFirst(true)], ...toSkipTake(query) }),
      prisma.examContribution.count({ where }),
    ]);
    return { items, total };
  },

  // Admin: lọc theo trạng thái thì sắp theo (status, created_at) cho đúng index
  async listAdmin(query: PaginationQuery, status?: ContributionStatus) {
    const where = { status };
    const [items, total] = await Promise.all([
      prisma.examContribution.findMany({ where, select: adminSelect, orderBy: [...newestFirst(!!status)], ...toSkipTake(query) }),
      prisma.examContribution.count({ where }),
    ]);
    return { items, total };
  },

  findImageCount: (id: string) => prisma.examContribution.findUnique({ where: { id }, select: { imageCount: true, status: true } }),

  /** Chốt bằng UPDATE có điều kiện (chỉ khi còn PENDING): hai admin duyệt cùng lúc thì chỉ một người thắng. */
  async review(id: string, data: { status: Exclude<ContributionStatus, "PENDING">; reviewNote?: string; reviewedById: string }) {
    const { count } = await prisma.examContribution.updateMany({ where: { id, status: "PENDING" }, data: { ...data, reviewedAt: new Date() } });
    return count === 1;
  },

  countPending: () => prisma.examContribution.count({ where: { status: "PENDING" } }),

  findUserId: (id: string) => prisma.examContribution.findUnique({ where: { id }, select: { userId: true } }),
};
