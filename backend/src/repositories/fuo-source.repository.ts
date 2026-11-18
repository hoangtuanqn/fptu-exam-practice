import { type FuoSourceResult, type FuoSourceStatus, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { type PaginationQuery, toSkipTake } from "../utils/pagination";

const isUniqueViolation = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

const URL_SELECT = {
  id: true,
  url: true,
  threadId: true,
  status: true,
  result: true,
  examId: true,
  addedQuestions: true,
  lastError: true,
  processedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.FuoSourceUrlSelect;

// Đưa mọi link chưa thuộc lượt này vào hàng chờ của lượt (lượt mới: tất cả; lượt tiếp tục: link mới dán thêm)
const queueForRun = (tx: Prisma.TransactionClient, runId: string) =>
  tx.fuoSourceUrl.updateMany({ where: { OR: [{ lastRunId: null }, { lastRunId: { not: runId } }] }, data: { status: "QUEUED", lastRunId: runId } });

export const fuoSourceRepository = {
  // Link đã có (trùng thread_id, unique) thì bỏ qua: dán lại nhiều lần không tạo trùng
  addMany: (rows: { threadId: string; url: string }[]) => prisma.fuoSourceUrl.createMany({ data: rows, skipDuplicates: true }),

  countAll: () => prisma.fuoSourceUrl.count(),

  list: (query: PaginationQuery, status?: FuoSourceStatus) => {
    const where = status ? { status } : {};
    return Promise.all([
      prisma.fuoSourceUrl.findMany({ where, select: URL_SELECT, orderBy: [{ updatedAt: "desc" }, { id: "desc" }], ...toSkipTake(query) }),
      prisma.fuoSourceUrl.count({ where }),
    ]);
  },

  countByStatus: () => prisma.fuoSourceUrl.groupBy({ by: ["status"], _count: { _all: true } }),

  findActiveRun: () => prisma.fuoSourceRun.findUnique({ where: { activeLock: true } }),

  findLatestRun: () => prisma.fuoSourceRun.findFirst({ orderBy: { id: "desc" } }), // UUID v7: id tăng theo thời gian tạo

  // Lượt mới: active_lock unique nên hai lần bấm cùng lúc chỉ một lần tạo được; lần kia nhận null (đã có lượt đang chạy)
  createRun: (createdById: string) =>
    prisma
      .$transaction(async (tx) => {
        const run = await tx.fuoSourceRun.create({ data: { activeLock: true, createdById } });
        const { count } = await queueForRun(tx, run.id);
        return tx.fuoSourceRun.update({ where: { id: run.id }, data: { total: count } });
      })
      .catch((err: unknown) => {
        if (isUniqueViolation(err)) return null;
        throw err;
      }),

  // Tiếp tục lượt đã dừng vì cần đăng nhập: giữ các con số và link đã xong, thêm link mới dán từ lúc đó
  resumeRun: (runId: string) =>
    prisma
      .$transaction(async (tx) => {
        const { count } = await tx.fuoSourceRun.updateMany({
          where: { id: runId, status: "NEEDS_AUTH" },
          data: { status: "RUNNING", activeLock: true, finishedAt: null, lastError: null },
        });
        if (count === 0) return null;
        const queued = await queueForRun(tx, runId);
        return tx.fuoSourceRun.update({ where: { id: runId }, data: { total: { increment: queued.count } } });
      })
      .catch((err: unknown) => {
        if (isUniqueViolation(err)) return null;
        throw err;
      }),

  // Nhận link kế tiếp đang chờ; điều kiện status nằm trong UPDATE nên hai luồng không nhận trùng
  async claimNext() {
    for (;;) {
      const next = await prisma.fuoSourceUrl.findFirst({ where: { status: "QUEUED" }, orderBy: [{ updatedAt: "asc" }, { id: "asc" }], select: { id: true, threadId: true, commentsAt: true } });
      if (!next) return null;
      const { count } = await prisma.fuoSourceUrl.updateMany({ where: { id: next.id, status: "QUEUED" }, data: { status: "RUNNING" } });
      if (count === 1) return next;
    }
  },

  succeed: (runId: string, id: string, data: { examId: string; result: FuoSourceResult; addedQuestions: number; commentsRefreshed: boolean }) =>
    prisma.$transaction([
      prisma.fuoSourceUrl.update({
        where: { id },
        data: {
          examId: data.examId,
          result: data.result,
          addedQuestions: data.addedQuestions,
          ...(data.commentsRefreshed && { commentsAt: new Date() }),
          status: "DONE",
          lastError: null,
          processedAt: new Date(),
        },
      }),
      prisma.fuoSourceRun.update({
        where: { id: runId },
        data: { done: { increment: 1 }, ...(data.result === "IMPORTED" && { imported: { increment: 1 } }), ...(data.result === "UPDATED" && { updated: { increment: 1 } }) },
      }),
    ]),

  fail: (runId: string, id: string, error: string) =>
    prisma.$transaction([
      prisma.fuoSourceUrl.update({ where: { id }, data: { status: "FAILED", lastError: error, addedQuestions: 0, processedAt: new Date() } }),
      prisma.fuoSourceRun.update({ where: { id: runId }, data: { failed: { increment: 1 }, lastError: error } }),
    ]),

  // Tổng kết cuối lượt cho thông báo admin: số câu đã thêm và số đề có câu mới chưa có đáp án.
  // Quét các link của lượt (last_run_id không có index: bảng chỉ vài nghìn dòng, chạy một lần mỗi lượt).
  async runSummary(runId: string) {
    const [sum, exams] = await Promise.all([
      prisma.fuoSourceUrl.aggregate({ where: { lastRunId: runId, status: "DONE" }, _sum: { addedQuestions: true } }),
      prisma.fuoSourceUrl.count({ where: { lastRunId: runId, status: "DONE", addedQuestions: { gt: 0 } } }),
    ]);
    return { addedQuestions: sum._sum.addedQuestions ?? 0, examsWithNewQuestions: exams };
  },

  requeue: (id: string) => prisma.fuoSourceUrl.update({ where: { id }, data: { status: "QUEUED" } }),

  // Tiến trình tắt giữa chừng: link đang chạy dở được xếp lại hàng
  requeueRunning: () => prisma.fuoSourceUrl.updateMany({ where: { status: "RUNNING" }, data: { status: "QUEUED" } }),

  finishRun: (runId: string, status: "DONE" | "NEEDS_AUTH", lastError?: string) =>
    prisma.fuoSourceRun.update({ where: { id: runId }, data: { status, activeLock: null, finishedAt: new Date(), ...(lastError && { lastError }) } }),
};
