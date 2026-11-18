import { type ExamKind, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { FUO_CATALOG_FAILURES_SHOWN, FUO_CATALOG_WRITE_CHUNK } from "../constants/fuo-catalog";

const isUniqueViolation = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

export interface CatalogThreadRow {
  threadId: string;
  subjectCode: string;
  title: string;
  label: string | null;
  kind: ExamKind;
  postedAt: Date | null;
  replies: number;
}

const chunks = <T>(list: T[]) => Array.from({ length: Math.ceil(list.length / FUO_CATALOG_WRITE_CHUNK) }, (_, i) => list.slice(i * FUO_CATALOG_WRITE_CHUNK, (i + 1) * FUO_CATALOG_WRITE_CHUNK));

const upsertThreads = (tx: Prisma.TransactionClient, rows: CatalogThreadRow[]) => {
  const values = rows.map((r) => Prisma.sql`(${r.threadId}, ${r.subjectCode}, ${r.title}, ${r.postedAt}, ${r.replies}, ${r.kind}, ${r.label}, NOW(3))`);
  return tx.$executeRaw`
    INSERT INTO fuo_threads (thread_id, subject_code, title, posted_at, replies, kind, label, synced_at)
    VALUES ${Prisma.join(values)}
    ON DUPLICATE KEY UPDATE subject_code = VALUES(subject_code), title = VALUES(title), posted_at = VALUES(posted_at), replies = VALUES(replies),
      kind = VALUES(kind), label = VALUES(label), synced_at = VALUES(synced_at)`;
};

export const fuoCatalogRepository = {
  findActiveRun: () => prisma.fuoCatalogRun.findUnique({ where: { activeLock: true } }),

  findLatestRun: () => prisma.fuoCatalogRun.findFirst({ orderBy: { id: "desc" } }), // UUID v7: id tăng theo thời gian tạo

  // active_lock unique: hai lần bấm cùng lúc chỉ một lần tạo được, lần kia nhận null
  createRun: (createdById: string, autoImport = false) =>
    prisma.fuoCatalogRun.create({ data: { activeLock: true, createdById, autoImport } }).catch((err: unknown) => {
      if (isUniqueViolation(err)) return null;
      throw err;
    }),

  // Tiếp tục lượt đã dừng vì cần đăng nhập: các môn đã xong giữ nguyên, môn còn chờ chạy tiếp
  resumeRun: (runId: string) =>
    prisma.fuoCatalogRun
      .updateMany({ where: { id: runId, status: "NEEDS_AUTH" }, data: { status: "RUNNING", activeLock: true, finishedAt: null, lastError: null } })
      .then(({ count }) => (count === 1 ? prisma.fuoCatalogRun.findUnique({ where: { id: runId } }) : null))
      .catch((err: unknown) => {
        if (isUniqueViolation(err)) return null;
        throw err;
      }),

  // Danh sách môn vừa đọc từ FuOverflow: thêm môn mới, xếp mọi môn của danh sách vào hàng chờ của lượt
  queueSubjects: (runId: string, codes: string[]) =>
    prisma.$transaction(async (tx) => {
      for (const part of chunks(codes)) await tx.fuoCatalogSubject.createMany({ data: part.map((code) => ({ code })), skipDuplicates: true });
      for (const part of chunks(codes)) await tx.fuoCatalogSubject.updateMany({ where: { code: { in: part } }, data: { status: "QUEUED", lastRunId: runId, lastError: null } });
      return tx.fuoCatalogRun.update({ where: { id: runId }, data: { subjectsTotal: codes.length } });
    }),

  // Môn kế tiếp đang chờ của lượt; điều kiện status nằm trong UPDATE nên không nhận trùng
  async claimNextSubject(runId: string) {
    for (;;) {
      const next = await prisma.fuoCatalogSubject.findFirst({ where: { lastRunId: runId, status: "QUEUED" }, orderBy: { code: "asc" }, select: { id: true, code: true } });
      if (!next) return null;
      const { count } = await prisma.fuoCatalogSubject.updateMany({ where: { id: next.id, status: "QUEUED" }, data: { status: "RUNNING" } });
      if (count === 1) return next;
    }
  },

  // Bài đã lưu (để chỉ ghi bài mới hoặc đã đổi)
  async findThreads(threadIds: string[]): Promise<CatalogThreadRow[]> {
    const out: CatalogThreadRow[] = [];
    for (const part of chunks(threadIds)) {
      out.push(
        ...(await prisma.fuoThread.findMany({
          where: { threadId: { in: part } },
          select: { threadId: true, subjectCode: true, title: true, label: true, kind: true, postedAt: true, replies: true },
        })),
      );
    }
    return out;
  },

  // Ghi kết quả một môn trong một transaction: bài mới/đổi, trạng thái môn và các con số của lượt
  saveSubject: (runId: string, subjectId: string, data: { added: CatalogThreadRow[]; changed: CatalogThreadRow[]; found: number; pages: number }) =>
    prisma.$transaction(
      async (tx) => {
        for (const part of chunks([...data.added, ...data.changed])) await upsertThreads(tx, part);
        await tx.fuoCatalogSubject.update({ where: { id: subjectId }, data: { status: "DONE", pages: data.pages, threads: data.found, lastError: null, crawledAt: new Date() } });
        return tx.fuoCatalogRun.update({
          where: { id: runId },
          data: { subjectsDone: { increment: 1 }, threadsFound: { increment: data.found }, threadsNew: { increment: data.added.length }, threadsUpdated: { increment: data.changed.length } },
        });
      },
      { timeout: 60_000 },
    ),

  failSubject: (runId: string, subjectId: string, error: string) =>
    prisma.$transaction([
      prisma.fuoCatalogSubject.update({ where: { id: subjectId }, data: { status: "FAILED", lastError: error, crawledAt: new Date() } }),
      prisma.fuoCatalogRun.update({ where: { id: runId }, data: { subjectsFailed: { increment: 1 }, lastError: error } }),
    ]),

  requeueSubject: (subjectId: string) => prisma.fuoCatalogSubject.update({ where: { id: subjectId }, data: { status: "QUEUED" } }),

  // Tiến trình tắt giữa chừng: môn đang quét dở được xếp lại hàng
  requeueRunning: () => prisma.fuoCatalogSubject.updateMany({ where: { status: "RUNNING" }, data: { status: "QUEUED" } }),

  findRunningSubject: (runId: string) => prisma.fuoCatalogSubject.findFirst({ where: { lastRunId: runId, status: "RUNNING" }, select: { code: true } }),

  findFailedSubjects: (runId: string) =>
    prisma.fuoCatalogSubject.findMany({
      where: { lastRunId: runId, status: "FAILED" },
      orderBy: { code: "asc" },
      take: FUO_CATALOG_FAILURES_SHOWN,
      select: { code: true, lastError: true, crawledAt: true },
    }),

  finishRun: (runId: string, status: "DONE" | "NEEDS_AUTH" | "FAILED", lastError?: string) =>
    prisma.fuoCatalogRun.update({ where: { id: runId }, data: { status, activeLock: null, finishedAt: new Date(), ...(lastError && { lastError }) } }),

  // Tổng của danh mục: số môn có bài, số bài, số bài theo loại (đếm trên index nên nhẹ)
  async totals() {
    const [subjects, byKind] = await Promise.all([
      prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(DISTINCT subject_code) AS n FROM fuo_threads`,
      prisma.fuoThread.groupBy({ by: ["kind"], _count: { _all: true } }),
    ]);
    return { subjects: Number(subjects[0]?.n ?? 0), byKind: byKind.map((g) => ({ kind: g.kind, count: g._count._all })) };
  },
};
