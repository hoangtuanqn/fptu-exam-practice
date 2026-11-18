import type { MaterialStatus, Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";

// Tài liệu slide người dùng tải lên để phân tích, các trang đã tách và tóm tắt theo chương. Mọi truy vấn đọc theo chủ sở hữu.

const UPLOAD_SELECT = {
  id: true,
  userId: true,
  subjectId: true,
  title: true,
  fileHash: true,
  pageCount: true,
  status: true,
  error: true,
  progressDone: true,
  progressTotal: true,
  createdAt: true,
  finishedAt: true,
  expiresAt: true,
} as const;

export type MaterialUploadRow = Prisma.MaterialUploadGetPayload<{ select: typeof UPLOAD_SELECT }>;

export interface NewUpload {
  userId: string;
  subjectId: string;
  title: string;
  fileHash: string;
  pageCount: number;
  expiresAt: Date;
}

export interface PageInsert {
  pageNo: number;
  kind: string;
  text: string;
}

export interface PageRow {
  pageNo: number;
  kind: string;
  text: string;
  figure: Prisma.JsonValue | null;
  assigned: boolean;
  chapterNumber: number | null;
}

export const materialRepository = {
  create: (data: NewUpload) => prisma.materialUpload.create({ data, select: UPLOAD_SELECT }),

  findById: (id: string) => prisma.materialUpload.findUnique({ where: { id }, select: UPLOAD_SELECT }),

  /** Chỉ trả khi đúng chủ và chưa hết hạn (người khác hỏi thì như không tồn tại). */
  findOwned: (id: string, userId: string, now: Date) => prisma.materialUpload.findFirst({ where: { id, userId, expiresAt: { gt: now } }, select: UPLOAD_SELECT }),

  listByUser: (userId: string, now: Date, take: number) =>
    prisma.materialUpload.findMany({ where: { userId, expiresAt: { gt: now } }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take, select: UPLOAD_SELECT }),

  /** Cùng người, cùng tệp (sha256), cùng môn, chưa hết hạn và không lỗi: dùng lại thay vì phân tích lại. */
  findDuplicate: (userId: string, subjectId: string, fileHash: string, now: Date) =>
    prisma.materialUpload.findFirst({ where: { userId, fileHash, subjectId, status: { not: "FAILED" }, expiresAt: { gt: now } }, orderBy: { id: "desc" }, select: UPLOAD_SELECT }),

  countActive: (userId: string) => prisma.materialUpload.count({ where: { userId, status: { in: ["QUEUED", "RUNNING"] } } }),

  /** Xoá của đúng chủ (trang và chương xoá theo khoá ngoại). Trả số dòng đã xoá. */
  deleteOwned: async (id: string, userId: string) => (await prisma.materialUpload.deleteMany({ where: { id, userId } })).count,

  exists: async (id: string) => !!(await prisma.materialUpload.findUnique({ where: { id }, select: { id: true } })),

  /** Nhận job QUEUED cũ nhất (đổi sang RUNNING có điều kiện để không ai nhận trùng). */
  async claimNext(): Promise<MaterialUploadRow | null> {
    for (;;) {
      const next = await prisma.materialUpload.findFirst({ where: { status: "QUEUED" }, orderBy: { id: "asc" }, select: UPLOAD_SELECT });
      if (!next) return null;
      const { count } = await prisma.materialUpload.updateMany({ where: { id: next.id, status: "QUEUED" }, data: { status: "RUNNING" } });
      if (count === 1) return { ...next, status: "RUNNING" };
    }
  },

  requeueRunning: async () => (await prisma.materialUpload.updateMany({ where: { status: "RUNNING" }, data: { status: "QUEUED" } })).count,

  activeIds: async () => (await prisma.materialUpload.findMany({ where: { status: { in: ["QUEUED", "RUNNING"] } }, select: { id: true } })).map((r) => r.id),

  setProgress: (id: string, done: number, total: number) => prisma.materialUpload.updateMany({ where: { id }, data: { progressDone: done, progressTotal: total } }),

  finish: (id: string, status: Extract<MaterialStatus, "DONE" | "FAILED">, error: string | null, now: Date) =>
    prisma.materialUpload.updateMany({ where: { id }, data: { status, error, finishedAt: now } }),

  deleteExpired: async (now: Date) => (await prisma.materialUpload.deleteMany({ where: { expiresAt: { lte: now } } })).count,

  // ---- Trang ----

  pages: (uploadId: string): Promise<PageRow[]> =>
    prisma.materialPage.findMany({ where: { uploadId }, orderBy: { pageNo: "asc" }, select: { pageNo: true, kind: true, text: true, figure: true, assigned: true, chapterNumber: true } }),

  /** Ghi các trang đã tách; trang đã có (chạy lại sau khi khởi động lại) thì bỏ qua. */
  savePages: (uploadId: string, pages: readonly PageInsert[]) => prisma.materialPage.createMany({ data: pages.map((p) => ({ uploadId, ...p })), skipDuplicates: true }),

  saveFigure: (uploadId: string, pageNo: number, kind: string, figure: Prisma.InputJsonValue | null) =>
    prisma.materialPage.updateMany({ where: { uploadId, pageNo }, data: { kind, ...(figure !== null && { figure }) } }),

  /** Ghi chương của một lô trang trong một giao dịch (gom theo chương: ít câu lệnh). */
  saveAssignments: (uploadId: string, assignments: ReadonlyMap<number, number | null>) => {
    const byChapter = new Map<number | null, number[]>();
    for (const [pageNo, chapter] of assignments) byChapter.set(chapter, [...(byChapter.get(chapter) ?? []), pageNo]);
    return prisma.$transaction(
      [...byChapter].map(([chapterNumber, pageNos]) => prisma.materialPage.updateMany({ where: { uploadId, pageNo: { in: pageNos } }, data: { assigned: true, chapterNumber } })),
    );
  },

  // ---- Chương ----

  chapters: (uploadId: string) =>
    prisma.materialChapter.findMany({ where: { uploadId }, orderBy: { chapterNumber: "asc" }, select: { chapterNumber: true, summary: true, keyPoints: true } }),

  saveChapter: (uploadId: string, chapterNumber: number, summary: string, keyPoints: Prisma.InputJsonValue) =>
    prisma.materialChapter.upsert({
      where: { uploadId_chapterNumber: { uploadId, chapterNumber } },
      create: { uploadId, chapterNumber, summary, keyPoints },
      update: { summary, keyPoints },
    }),
};

export type MaterialRepository = typeof materialRepository;
