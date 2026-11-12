import { createHash } from "node:crypto";
import type { Role } from "@prisma/client";
import { aiReady } from "../constants/ai";
import { HTTP_STATUS } from "../constants/httpStatus";
import { MATERIAL_ADMIN_ONLY, MATERIAL_LIST_MAX, MATERIAL_MAX_ACTIVE_PER_USER, MATERIAL_MAX_PAGES, MATERIAL_RETENTION_DAYS } from "../constants/materials";
import { frequencyStatsRepository } from "../repositories/frequency-stats.repository";
import { materialRepository, type MaterialUploadRow, type NewUpload, type PageRow } from "../repositories/material.repository";
import { subjectRepository, type SubjectRef } from "../repositories/subject.repository";
import { AppError } from "../rules/error";
import { estimateTokens, pageRanges, titleFromFilename, isPdfBuffer } from "../utils/material-analysis";
import { buildTopicItems } from "../utils/topic-items";
import { DAY_MS } from "../utils/time";
import { aiSettingService } from "./ai-setting.service";
import { materialTokenLedger, type TokenLedger } from "./ai-token-ledger.service";
import type { KeyPoint } from "./ai/material-prompts";
import { figureOf, MATERIAL_MESSAGES, materialJobService, quotaMessage } from "./material-job.service";
import { pdfjsEngine, PdfOpenError, type PdfEngine } from "./materials/pdf-extractor";
import { materialTempFiles, type MaterialTempFiles } from "./materials/temp-files";
import { planService } from "./plan.service";

// Phân tích slide (Pro): nhận tệp, xếp hàng job, trả kết quả cho đúng chủ. Số liệu "chương hay ra" ghép lúc đọc, không lưu.

export interface MaterialActor {
  id: number;
  role: Role;
}

export interface UploadedFile {
  buffer: Buffer;
  originalname?: string;
}

interface ChapterStatRow {
  chapter: string;
  examsWithChapter: number;
  totalExams: number;
  confidence: string;
}

/** Phần lưu trữ service cần (materialRepository đáp ứng; test dùng bản trong bộ nhớ). */
export interface MaterialServiceStore {
  create(data: NewUpload): Promise<MaterialUploadRow>;
  findOwned(id: number, userId: number, now: Date): Promise<MaterialUploadRow | null>;
  listByUser(userId: number, now: Date, take: number): Promise<MaterialUploadRow[]>;
  findDuplicate(userId: number, subjectId: number, fileHash: string, now: Date): Promise<MaterialUploadRow | null>;
  countActive(userId: number): Promise<number>;
  deleteOwned(id: number, userId: number): Promise<number>;
  pages(uploadId: number): Promise<PageRow[]>;
  chapters(uploadId: number): Promise<{ chapterNumber: number; summary: string; keyPoints: unknown }[]>;
}

export interface MaterialServiceDeps {
  repo: MaterialServiceStore;
  subjects: {
    findByCode(code: string): Promise<SubjectRef | null>;
    findManyByIds(ids: readonly number[]): Promise<SubjectRef[]>;
    chapters(subjectId: number): Promise<{ number: number; title: string; topics: string[] }[]>;
  };
  chapterStats(subjectId: number): Promise<ChapterStatRow[]>;
  isPro(userId: number): Promise<boolean>;
  adminOnly: boolean; // true: chỉ admin dùng được (Pro thấy thông báo đang hoàn thiện)
  aiReady(): Promise<boolean>;
  ledger: TokenLedger;
  pdf: PdfEngine;
  files: Pick<MaterialTempFiles, "write" | "remove">;
  notify(): void;
  now(): Date;
}

const MSG = {
  proOnly: "Tính năng chỉ dành cho PRO.",
  comingSoon: "Chức năng đang trong quá trình hoàn thiện.",
  noFile: "Vui lòng chọn tệp PDF",
  notPdf: "Tệp tải lên phải là PDF",
  emptyPdf: "Tệp PDF không có trang nào",
  tooManyPages: `Tài liệu tối đa ${MATERIAL_MAX_PAGES} trang. Hãy tách thành các phần nhỏ hơn.`,
  noSubject: "Không tìm thấy môn học",
  busy: "Bạn đang có tài liệu chờ phân tích. Hãy đợi xong rồi tải tiếp.",
  notFound: "Không tìm thấy tài liệu",
} as const;

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function createMaterialService(deps: MaterialServiceDeps) {
  const canUse = async (actor: MaterialActor) => actor.role === "ADMIN" || (!deps.adminOnly && (await deps.isPro(actor.id)));
  // Tài khoản không dùng được: Pro thì "đang hoàn thiện", chưa Pro thì "chỉ dành cho PRO"
  const accessOf = async (actor: MaterialActor) => ((await canUse(actor)) ? ("ALLOWED" as const) : (await deps.isPro(actor.id)) ? ("COMING_SOON" as const) : ("PRO_ONLY" as const));

  const subjectMap = async (ids: number[]) => new Map((await deps.subjects.findManyByIds([...new Set(ids)])).map((s) => [s.id, s]));

  const summaryOf = (u: MaterialUploadRow, subject: SubjectRef | undefined) => ({
    id: u.id,
    title: u.title,
    subjectCode: subject?.code ?? null,
    subjectName: subject?.name ?? null,
    status: u.status,
    progress: { done: u.progressDone, total: u.progressTotal },
    pages: u.pageCount,
    error: u.status === "FAILED" ? (u.error ?? MATERIAL_MESSAGES.generic) : null,
    createdAt: u.createdAt.toISOString(),
    expiresAt: u.expiresAt.toISOString(),
  });

  return {
    /** Phần trăm đã dùng trong cửa sổ hiện tại (không lộ số token). */
    async quota(actor: MaterialActor) {
      const [access, status] = await Promise.all([accessOf(actor), deps.ledger.status(actor.id, deps.now())]);
      return { isPro: access === "ALLOWED", access, percentUsed: status.percentUsed, resetsAt: iso(status.resetsAt) };
    },

    /** Kiểm tra rẻ chạy TRƯỚC khi nhận tệp (không để tài khoản thường bắt máy chủ đọc tệp lớn). create() kiểm tra lại. */
    async assertCanUpload(actor: MaterialActor) {
      const access = await accessOf(actor);
      if (access !== "ALLOWED") throw AppError.forbidden(access === "COMING_SOON" ? MSG.comingSoon : MSG.proOnly);
      if (!(await deps.aiReady())) throw new AppError(MATERIAL_MESSAGES.aiOff, HTTP_STATUS.SERVICE_UNAVAILABLE);
    },

    async create(actor: MaterialActor, file: UploadedFile | undefined, subjectCode: string) {
      await this.assertCanUpload(actor);
      if (!file?.buffer?.length) throw new AppError(MSG.noFile, HTTP_STATUS.BAD_REQUEST, { file: MSG.noFile });
      if (!isPdfBuffer(file.buffer)) throw new AppError(MSG.notPdf, HTTP_STATUS.BAD_REQUEST, { file: MSG.notPdf });

      const subject = await deps.subjects.findByCode(subjectCode);
      if (!subject) throw new AppError(MSG.noSubject, HTTP_STATUS.BAD_REQUEST, { subjectCode: MSG.noSubject });
      if (!(await deps.subjects.chapters(subject.id)).some((c) => c.number > 0)) throw new AppError(MATERIAL_MESSAGES.noChapters, HTTP_STATUS.BAD_REQUEST, { subjectCode: MATERIAL_MESSAGES.noChapters });

      const now = deps.now();
      const fileHash = createHash("sha256").update(file.buffer).digest("hex");
      const dup = await deps.repo.findDuplicate(actor.id, subject.id, fileHash, now);
      if (dup) return { id: dup.id, status: dup.status, duplicate: true };

      let pageCount: number;
      try {
        const doc = await deps.pdf.open(file.buffer);
        pageCount = doc.pageCount;
        await doc.close();
      } catch (err) {
        if (err instanceof PdfOpenError) throw new AppError(MATERIAL_MESSAGES.badPdf, HTTP_STATUS.BAD_REQUEST, { file: MATERIAL_MESSAGES.badPdf });
        throw err;
      }
      if (pageCount < 1) throw new AppError(MSG.emptyPdf, HTTP_STATUS.BAD_REQUEST, { file: MSG.emptyPdf });
      if (pageCount > MATERIAL_MAX_PAGES) throw new AppError(MSG.tooManyPages, HTTP_STATUS.BAD_REQUEST, { file: MSG.tooManyPages });

      if ((await deps.repo.countActive(actor.id)) >= MATERIAL_MAX_ACTIVE_PER_USER) throw new AppError(MSG.busy, HTTP_STATUS.TOO_MANY_REQUESTS);

      // Kiểm tra sơ bộ (chưa biết bao nhiêu trang hình): phần chữ đã không đủ thì từ chối ngay. Job kiểm tra lại đầy đủ sau khi tách trang.
      const need = estimateTokens({ figurePages: 0, pages: pageCount });
      const status = await deps.ledger.status(actor.id, now);
      if (status.remaining < need) {
        const at = await deps.ledger.availableAt(actor.id, need, now);
        if (!at) throw new AppError(MATERIAL_MESSAGES.tooLarge, HTTP_STATUS.BAD_REQUEST, { file: MATERIAL_MESSAGES.tooLarge });
        throw new AppError(quotaMessage(at), HTTP_STATUS.TOO_MANY_REQUESTS); // giờ thử lại chỉ nằm trong lời nhắn
      }

      const row = await deps.repo.create({
        userId: actor.id,
        subjectId: subject.id,
        title: titleFromFilename(file.originalname),
        fileHash,
        pageCount,
        expiresAt: new Date(now.getTime() + MATERIAL_RETENTION_DAYS * DAY_MS),
      });
      try {
        await deps.files.write(row.id, file.buffer);
      } catch (err) {
        await deps.repo.deleteOwned(row.id, actor.id).catch(() => undefined);
        throw err;
      }
      deps.notify();
      return { id: row.id, status: row.status, duplicate: false };
    },

    async list(actor: MaterialActor) {
      const rows = await deps.repo.listByUser(actor.id, deps.now(), MATERIAL_LIST_MAX);
      const subjects = await subjectMap(rows.map((r) => r.subjectId));
      return { items: rows.map((r) => summaryOf(r, subjects.get(r.subjectId))) };
    },

    /** Chỉ chủ tài liệu xem được; người khác nhận 404 (không lộ là tài liệu có tồn tại). */
    async get(actor: MaterialActor, id: number) {
      const upload = await deps.repo.findOwned(id, actor.id, deps.now());
      if (!upload) throw AppError.notFound(MSG.notFound);
      const subject = (await subjectMap([upload.subjectId])).get(upload.subjectId);
      const base = summaryOf(upload, subject);
      if (upload.status !== "DONE") return base;

      const [pages, rows, subjectChapters, stats] = await Promise.all([
        deps.repo.pages(id),
        deps.repo.chapters(id),
        deps.subjects.chapters(upload.subjectId),
        deps.chapterStats(upload.subjectId).catch(() => [] as ChapterStatRow[]),
      ]);
      return { ...base, ...buildResult(pages, rows, subjectChapters, stats) };
    },

    async remove(actor: MaterialActor, id: number) {
      if ((await deps.repo.deleteOwned(id, actor.id)) === 0) throw AppError.notFound(MSG.notFound);
      await deps.files.remove(id); // job đang chạy sẽ tự dừng ở lần kiểm tra kế tiếp
    },
  };
}

/** Ghép tóm tắt chương với trang, hình và thống kê ra đề (đọc lúc này từ chapter_stats, không lưu). */
export function buildResult(
  pages: readonly PageRow[],
  rows: readonly { chapterNumber: number; summary: string; keyPoints: unknown }[],
  subjectChapters: readonly { number: number; title: string; topics: string[] }[],
  stats: readonly ChapterStatRow[],
) {
  const titleOf = new Map(subjectChapters.map((c) => [c.number, c.title]));
  // Thống kê lưu theo nhãn chủ đề của câu hỏi; nhãn của chương lấy đúng cách trình gắn chủ đề đặt tên
  const labelOf = new Map(buildTopicItems([...subjectChapters]).flatMap((t) => (t.chapter !== undefined ? [[t.chapter, t.label] as const] : [])));
  const statOf = new Map(stats.map((s) => [s.chapter, s]));

  const chapters = rows.map((r) => {
    const own = pages.filter((p) => p.chapterNumber === r.chapterNumber);
    const title = titleOf.get(r.chapterNumber) ?? `Chương ${r.chapterNumber}`;
    const stat = statOf.get(labelOf.get(r.chapterNumber) ?? "") ?? statOf.get(title);
    return {
      number: r.chapterNumber,
      title,
      pageRange: pageRanges(own.map((p) => p.pageNo)),
      summary: r.summary,
      keyPoints: Array.isArray(r.keyPoints) ? (r.keyPoints as KeyPoint[]) : [],
      figures: own.flatMap((p) => {
        const f = figureOf(p);
        return f ? [{ page: p.pageNo, type: f.type, summary: f.summary, confidence: f.confidence }] : [];
      }),
      stats: stat ? { examsWithChapter: stat.examsWithChapter, totalExams: stat.totalExams, confidence: stat.confidence } : null,
    };
  });
  return { chapters: chapters.sort((a, b) => a.number - b.number), unmatchedPages: pages.filter((p) => p.chapterNumber === null).length };
}

export const materialService = createMaterialService({
  repo: materialRepository,
  subjects: subjectRepository,
  chapterStats: (subjectId) => frequencyStatsRepository.chapterStats(subjectId),
  isPro: (userId) => planService.isPro(userId),
  adminOnly: MATERIAL_ADMIN_ONLY,
  aiReady: async () => aiReady(await aiSettingService.get()),
  ledger: materialTokenLedger,
  pdf: pdfjsEngine,
  files: materialTempFiles,
  notify: () => materialJobService.notifyEnqueued(),
  now: () => new Date(),
});
