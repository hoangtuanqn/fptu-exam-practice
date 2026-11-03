import type { CrawlJob, CrawlJobStatus } from "@prisma/client";
import { prisma } from "../configs/prisma";
import type { Owner } from "../utils/actor";
import type { Db } from "./wallet.repository";

export const crawlJobRepository = {
  create: (
    data: {
      threadId: string;
      userId?: number;
      guestId?: string;
      chargedAmount: number;
      // Dùng để ghi nhận một lượt lấy đề đã xong ngay (đề có sẵn), phục vụ đếm giới hạn theo ngày
      status?: "DONE";
      examId?: number;
      finishedAt?: Date;
    },
    db: Db = prisma,
  ) =>
    db.crawlJob.create({ data }),

  // Số lượt lấy đề của khách từ mốc `since` (lượt lỗi không tính để khách được thử lại)
  countGuestFetchesSince: (guestId: string, since: Date) =>
    prisma.crawlJob.count({ where: { guestId, createdAt: { gte: since }, status: { not: "FAILED" } } }),

  // Số lượt đang chạy hoặc xếp hàng phía trước job này (để báo "còn N lượt phía trước")
  countAhead: (id: number) => prisma.crawlJob.count({ where: { id: { lt: id }, status: { in: ["QUEUED", "RUNNING"] } } }),

  findById: (id: number) => prisma.crawlJob.findUnique({ where: { id } }),

  // Người này đã có lượt đang chờ/đang chạy cho thread này thì dùng lại, không tạo thêm.
  // Mỗi người có job riêng để đề được thêm vào thư viện của đúng người đó.
  findActive: (threadId: string, owner: Owner) =>
    prisma.crawlJob.findFirst({
      where: { threadId, ...("userId" in owner ? { userId: owner.userId } : { guestId: owner.guestId }), status: { in: ["QUEUED", "RUNNING"] } },
      orderBy: { id: "asc" },
    }),

  // Nhận job cũ nhất đang chờ. Điều kiện status nằm trong UPDATE nên hai worker không nhận trùng một job
  async claimNext(): Promise<CrawlJob | null> {
    for (;;) {
      const next = await prisma.crawlJob.findFirst({ where: { status: "QUEUED" }, orderBy: { id: "asc" } });
      if (!next) return null;
      const { count } = await prisma.crawlJob.updateMany({
        where: { id: next.id, status: "QUEUED" },
        data: { status: "RUNNING", startedAt: new Date(), stage: "Bắt đầu" },
      });
      if (count === 1) return next; // không thì worker khác đã nhận, thử job kế
    }
  },

  async setStage(id: number, stage: string): Promise<void> {
    await prisma.crawlJob.update({ where: { id }, data: { stage } });
  },

  finish: (id: number, data: { status: Extract<CrawlJobStatus, "DONE" | "FAILED">; examId?: number; error?: string }) =>
    prisma.crawlJob.update({ where: { id }, data: { ...data, stage: null, finishedAt: new Date() } }),

  // Đánh dấu lỗi bằng điều kiện ở DB: chỉ một tiến trình đổi được RUNNING -> FAILED, nên hoàn phí không bị lặp
  async markFailed(db: Db, id: number, error: string) {
    const { count } = await db.crawlJob.updateMany({
      where: { id, status: "RUNNING" },
      data: { status: "FAILED", error, stage: null, finishedAt: new Date() },
    });
    return count === 1;
  },

  // Server tắt giữa chừng: job đang chạy dở được xếp lại hàng
  requeueRunning: () =>
    prisma.crawlJob.updateMany({ where: { status: "RUNNING" }, data: { status: "QUEUED", stage: null } }),
};
