import { prisma } from "../configs/prisma";
import type { Db } from "./wallet.repository";

// crawl_jobs: chỉ còn ghi lượt mở đề của khách (đếm giới hạn ngày); các dòng cũ giữ cho lịch sử admin
export const crawlJobRepository = {
  create: (
    data: { threadId: string; userId?: string; guestId?: string; chargedAmount: number; status?: "DONE"; examId?: string; finishedAt?: Date },
    db: Db = prisma,
  ) => db.crawlJob.create({ data }),

  // Số lượt lấy đề của khách từ mốc `since` (lượt lỗi không tính để khách được thử lại)
  countGuestFetchesSince: (guestId: string, since: Date) =>
    prisma.crawlJob.count({ where: { guestId, createdAt: { gte: since }, status: { not: "FAILED" } } }),
};
