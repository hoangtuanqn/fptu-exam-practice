import { type FuoSourceResult, type FuoSourceStatus, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { FUO_SOURCE_INSERT_CHUNK } from "../constants/fuo-source";
import { catalogSourceRows } from "../utils/fuo-source-queue";
import { type PaginationQuery, toSkipTake } from "../utils/pagination";

const QUEUE_TX_TIMEOUT_MS = 60_000; // xếp hàng nghìn link theo từng phần trong một transaction (mặc định của Prisma chỉ 5 giây)
// P2034: hai lần bấm cùng lúc có thể bị MySQL huỷ một bên vì deadlock; coi như lần sau thua khoá
const isUniqueViolation = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2002" || err.code === "P2034");

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

// Đưa vào hàng chờ của lượt chỉ link cần làm: link mới (NEW), link lỗi hoặc còn chờ từ lượt khác, và link đã xong mà bài đã đổi
// trên FuOverflow sau lần xử lý (fuo_threads.synced_at > processed_at). Link đã xong và bài không đổi thì không tải lại.
const queueForRun = async (tx: Prisma.TransactionClient, runId: string) => {
  // Link chưa có đề (NEW) ở lại "Chưa lấy": chỉ lấy ảnh và nhờ AI giải khi có người bấm vào đề; lượt này chỉ cập nhật đề đã có
  const pending = await tx.$executeRaw`
    UPDATE fuo_source_urls s
    SET s.status = 'QUEUED', s.last_run_id = ${runId}, s.updated_at = ${new Date()}
    WHERE s.status IN ('NEW', 'QUEUED', 'FAILED') AND (s.last_run_id IS NULL OR s.last_run_id <> ${runId})
      AND EXISTS (SELECT 1 FROM exams e WHERE e.thread_id = s.thread_id)`;
  const changed = await tx.$executeRaw`
    UPDATE fuo_source_urls s JOIN fuo_threads t ON t.thread_id = s.thread_id
    SET s.status = 'QUEUED', s.last_run_id = ${runId}, s.updated_at = ${new Date()}
    WHERE s.status = 'DONE' AND t.synced_at > s.processed_at`;
  return { count: pending + changed };
};

export const fuoSourceRepository = {
  // Link đã có (trùng thread_id, unique) thì bỏ qua: dán lại nhiều lần không tạo trùng
  addMany: (rows: { threadId: string; url: string }[]) => prisma.fuoSourceUrl.createMany({ data: rows, skipDuplicates: true }),

  // Bài FE của danh mục chưa có link: thêm vào danh sách (bài đã có đề ghi là đã xử lý, xem catalogSourceRows). Trả về số link thêm.
  // Bài chưa có đề không được thêm: chúng vẫn hiện trong danh mục, chỉ lấy ảnh và nhờ AI giải khi có người bấm vào (tránh tốn chi phí).
  async addCatalogThreads() {
    const found = await prisma.$queryRaw<{ threadId: string; examId: string | null }[]>`
      SELECT t.thread_id AS threadId, e.id AS examId FROM fuo_threads t
      LEFT JOIN fuo_source_urls s ON s.thread_id = t.thread_id
      LEFT JOIN exams e ON e.thread_id = t.thread_id
      WHERE t.kind = 'FE' AND s.id IS NULL
      ORDER BY t.posted_at DESC`;
    const rows = catalogSourceRows(found.filter((f) => f.examId), new Date());
    let added = 0;
    for (let i = 0; i < rows.length; i += FUO_SOURCE_INSERT_CHUNK) added += (await prisma.fuoSourceUrl.createMany({ data: rows.slice(i, i + FUO_SOURCE_INSERT_CHUNK), skipDuplicates: true })).count;
    return added;
  },

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
  createRun: (createdById: string | null) =>
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

  /**
   * "Lấy hết đề còn thiếu": xếp các link của `threadIds` (đã thêm vào danh sách) vào lượt đang chạy, hoặc tạo lượt mới nếu chưa có.
   * Link mới/lỗi được xếp lại; link còn chờ của lượt khác (vd. lượt dừng vì cần đăng nhập) chuyển sang lượt này; link đã xong bỏ qua.
   * Không có link nào cần lấy thì không tạo lượt. Hai lần bấm cùng lúc: active_lock unique, lần sau nhận started=false, queued=0.
   */
  queueMissing: (threadIds: string[], createdById: string) =>
    prisma
      .$transaction(async (tx) => {
        // Khoá dòng lượt đang chạy: finishRun cũng khoá dòng này nên lượt không kết thúc giữa chừng mà bỏ sót link vừa xếp
        const [locked] = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM fuo_source_runs WHERE active_lock = 1 FOR UPDATE`;
        const active = locked ?? null;
        const run = active ?? (await tx.fuoSourceRun.create({ data: { activeLock: true, createdById } }));
        let queued = 0;
        for (let i = 0; i < threadIds.length; i += FUO_SOURCE_INSERT_CHUNK) {
          const { count } = await tx.fuoSourceUrl.updateMany({
            where: {
              threadId: { in: threadIds.slice(i, i + FUO_SOURCE_INSERT_CHUNK) },
              status: { in: ["NEW", "QUEUED", "FAILED"] },
              OR: [{ lastRunId: null }, { lastRunId: { not: run.id } }],
            },
            data: { status: "QUEUED", lastRunId: run.id },
          });
          queued += count;
        }
        // Link còn chờ của lượt khác (dừng vì cần đăng nhập, bộ lọc khác...) cũng do lượt này chạy: tính vào tổng cho khớp
        const adopted = await tx.fuoSourceUrl.updateMany({
          where: { status: "QUEUED", OR: [{ lastRunId: null }, { lastRunId: { not: run.id } }] },
          data: { lastRunId: run.id },
        });
        queued += adopted.count;
        if (!active && queued === 0) {
          await tx.fuoSourceRun.delete({ where: { id: run.id } });
          return { started: false, queued: 0 };
        }
        await tx.fuoSourceRun.update({ where: { id: run.id }, data: { total: { increment: queued } } });
        return { started: !active, queued };
      }, { timeout: QUEUE_TX_TIMEOUT_MS })
      .catch((err: unknown) => {
        if (isUniqueViolation(err)) return { started: false, queued: 0 };
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

  // DONE mà còn link chờ (vừa được queueMissing xếp vào) thì chưa kết thúc: trả null để worker chạy tiếp lượt này.
  // Khoá dòng lượt trước khi đếm (queueMissing giữ cùng khoá) nên không có link nào bị xếp vào lượt đã xong.
  finishRun: (runId: string, status: "DONE" | "NEEDS_AUTH", lastError?: string) =>
    prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM fuo_source_runs WHERE id = ${runId} FOR UPDATE`;
      if (status === "DONE" && (await tx.fuoSourceUrl.count({ where: { status: "QUEUED" } })) > 0) return null;
      return tx.fuoSourceRun.update({ where: { id: runId }, data: { status, activeLock: null, finishedAt: new Date(), ...(lastError && { lastError }) } });
    }),
};
