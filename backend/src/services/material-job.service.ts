import type { Prisma } from "@prisma/client";
import { aiReady } from "../constants/ai";
import {
  AI_TOKEN_USAGE_KEEP_MS,
  MATERIAL_ASSIGN_BATCH,
  MATERIAL_ASSIGN_MAX_TOKENS,
  MATERIAL_CALL_RESERVE_TOKENS,
  MATERIAL_CHAPTER_INPUT_MAX_CHARS,
  MATERIAL_CHAPTER_MAX_TOKENS,
  MATERIAL_FALLBACK_MODEL,
  MATERIAL_FIGURE_MAX_TOKENS,
  MATERIAL_MAX_PAGES,
  MATERIAL_ORPHAN_FILE_MAX_AGE_MS,
  MATERIAL_PAGE_TEXT_MAX,
  MATERIAL_TEXT_MODEL,
  MATERIAL_VISION_CONCURRENCY,
  MATERIAL_VISION_MODEL,
} from "../constants/materials";
import { aiTokenUsageRepository } from "../repositories/ai-token-usage.repository";
import { materialRepository, type MaterialUploadRow, type PageInsert, type PageRow } from "../repositories/material.repository";
import { subjectRepository } from "../repositories/subject.repository";
import { chunk, estimateTokens, needsVision, runPool } from "../utils/material-analysis";
import { formatVnTime } from "../utils/time";
import { aiSettingService } from "./ai-setting.service";
import { materialTokenLedger, type TokenLedger } from "./ai-token-ledger.service";
import { createMaterialClaudeClient, type MaterialClaudeClient, type MaterialClaudeRequest } from "./ai/material-claude.client";
import {
  ASSIGN_SCHEMA,
  ASSIGN_SYSTEM,
  assignContent,
  CHAPTER_SCHEMA,
  CHAPTER_SYSTEM,
  chapterContent,
  FIGURE_SCHEMA,
  FIGURE_SYSTEM,
  figureContent,
  needsFallback,
  parseAssignments,
  parseChapterSummary,
  parseFigure,
  type FigureResult,
} from "./ai/material-prompts";
import { pdfjsEngine, PdfOpenError, PdfRenderUnavailableError, type PdfEngine, type PdfHandle } from "./materials/pdf-extractor";
import { materialTempFiles, type MaterialTempFiles } from "./materials/temp-files";

// Một job cho mỗi tài liệu tải lên, chạy nền trong tiến trình server, MỘT job một lúc (máy chủ nhỏ):
// tách trang -> mô tả trang hình (Haiku, không chắc thì Sonnet) -> gán chương theo lô -> tóm tắt từng chương -> DONE.
// Kiểm tra giới hạn token TRƯỚC mỗi lần gọi và ghi token SAU mỗi lần gọi. Mọi bước bỏ qua phần đã làm (khởi động lại thì chạy tiếp).
// Tệp PDF gốc bị xoá ngay khi không cần nữa và luôn bị xoá khi job kết thúc.

export const MATERIAL_MESSAGES = {
  aiOff: "Tính năng phân tích slide đang tạm dừng. Vui lòng thử lại sau.",
  noChapters: "Môn này chưa có danh sách chương nên chưa phân tích được.",
  fileGone: "Tệp tạm của tài liệu không còn. Vui lòng tải lên lại.",
  badPdf: "Không đọc được tệp PDF (tệp hỏng hoặc có mật khẩu).",
  summaryFailed: "Không tạo được tóm tắt cho tài liệu này. Vui lòng thử lại sau.",
  generic: "Không phân tích được tài liệu này. Vui lòng thử lại sau.",
  // Máy chủ thiếu thư viện vẽ trang (gói @napi-rs/canvas không có bản cho nền tảng này): lỗi của máy chủ, không phải của tệp
  renderUnavailable: "Máy chủ tạm thời chưa đọc được hình trong slide. Vui lòng thử lại sau, chúng tôi đang khắc phục.",
  tooLarge: "Tài liệu này quá dài để phân tích một lần. Hãy tách thành các phần nhỏ hơn rồi tải lên lại.",
  quota: (at: Date) => `Bạn đã dùng hết lượt phân tích slide hiện có. Thử lại sau ${formatVnTime(at)}.`,
} as const;

/** Lỗi có lời nhắn dành cho người dùng. */
export class MaterialUserError extends Error {}
/** Hết token trong cửa sổ: `at` = lúc đủ lại (null: tài liệu lớn hơn cả giới hạn). */
export class MaterialQuotaError extends Error {
  constructor(public at: Date | null) {
    super("quota");
  }
}
class Cancelled extends Error {} // người dùng đã xoá tài liệu giữa chừng

export const quotaMessage = (at: Date | null) => (at ? MATERIAL_MESSAGES.quota(at) : MATERIAL_MESSAGES.tooLarge);

/** Phần lưu trữ job cần (materialRepository đáp ứng; test dùng bản trong bộ nhớ). */
export interface MaterialJobStore {
  findById(id: number): Promise<Pick<MaterialUploadRow, "id" | "userId" | "subjectId" | "pageCount"> | null>;
  exists(id: number): Promise<boolean>;
  pages(id: number): Promise<PageRow[]>;
  savePages(id: number, pages: readonly PageInsert[]): Promise<unknown>;
  saveFigure(id: number, pageNo: number, kind: string, figure: Prisma.InputJsonValue | null): Promise<unknown>;
  saveAssignments(id: number, assignments: ReadonlyMap<number, number | null>): Promise<unknown>;
  chapters(id: number): Promise<{ chapterNumber: number }[]>;
  saveChapter(id: number, chapterNumber: number, summary: string, keyPoints: Prisma.InputJsonValue): Promise<unknown>;
  setProgress(id: number, done: number, total: number): Promise<unknown>;
  finish(id: number, status: "DONE" | "FAILED", error: string | null, now: Date): Promise<unknown>;
}

export interface MaterialJobDeps {
  store: MaterialJobStore;
  subject(subjectId: number): Promise<{ name: string; chapters: { number: number; title: string }[] } | null>;
  /** Client Claude theo cấu hình AI của trang quản trị; null khi AI đang tắt hoặc chưa có khoá. */
  client(): Promise<MaterialClaudeClient | null>;
  ledger: TokenLedger;
  pdf: PdfEngine;
  files: Pick<MaterialTempFiles, "read" | "remove">;
  now(): Date;
  log(message: string): void;
}

export type MaterialJobOutcome = "DONE" | "FAILED" | "CANCELLED" | "MISSING";

export function createMaterialJob(deps: MaterialJobDeps) {
  const { store, ledger } = deps;

  return async function processUpload(uploadId: number): Promise<MaterialJobOutcome> {
    const upload = await store.findById(uploadId);
    if (!upload) return "MISSING";
    let handle: PdfHandle | null = null;
    const closePdf = async () => {
      const h = handle as PdfHandle | null;
      handle = null;
      await h?.close();
      await deps.files.remove(uploadId);
    };

    try {
      const client = await deps.client();
      if (!client) throw new MaterialUserError(MATERIAL_MESSAGES.aiOff);
      const subject = await deps.subject(upload.subjectId);
      const chapters = (subject?.chapters ?? []).filter((c) => c.number > 0);
      if (!subject || chapters.length === 0) throw new MaterialUserError(MATERIAL_MESSAGES.noChapters);

      const openPdf = async () => {
        if (handle) return handle;
        const data = await deps.files.read(uploadId);
        if (!data) throw new MaterialUserError(MATERIAL_MESSAGES.fileGone);
        try {
          handle = await deps.pdf.open(data);
        } catch (err) {
          if (err instanceof PdfOpenError) throw new MaterialUserError(MATERIAL_MESSAGES.badPdf);
          throw err;
        }
        return handle;
      };

      // 1. Tách trang (bỏ qua trang đã lưu)
      let pages = await store.pages(uploadId);
      if (pages.length < upload.pageCount) {
        const pdf = await openPdf();
        const have = new Set(pages.map((p) => p.pageNo));
        const fresh: PageInsert[] = [];
        for (let n = 1; n <= Math.min(pdf.pageCount, upload.pageCount, MATERIAL_MAX_PAGES); n++) {
          if (have.has(n)) continue;
          await yieldToEventLoop(); // nhường lượt giữa các trang (phần đọc PDF của pdf.js chạy trên luồng chính) để API vẫn trả lời
          const p = await pdf.extractPage(n);
          fresh.push({ pageNo: p.pageNo, kind: p.kind, text: p.text });
        }
        if (fresh.length) await store.savePages(uploadId, fresh);
        pages = await store.pages(uploadId);
      }

      const figureTodo = pages.filter((p) => needsVision(p.kind) && p.figure === null);
      const unassigned = pages.filter((p) => !p.assigned);
      const doneChapters = new Set((await store.chapters(uploadId)).map((c) => c.chapterNumber));

      // Tiến độ theo đơn vị việc: 1 (tách trang) + mỗi trang hình + mỗi lô gán chương + mỗi chương (chưa biết thì tính theo số chương của môn)
      const visionTotal = pages.filter((p) => needsVision(p.kind) || p.figure !== null).length;
      const assignTotal = Math.ceil(pages.length / MATERIAL_ASSIGN_BATCH);
      let chapterTotal = unassigned.length ? chapters.length : new Set(pages.flatMap((p) => (p.chapterNumber !== null ? [p.chapterNumber] : []))).size;
      let done = 1 + (visionTotal - figureTodo.length) + (assignTotal - Math.ceil(unassigned.length / MATERIAL_ASSIGN_BATCH)) + doneChapters.size;
      const total = () => 1 + visionTotal + assignTotal + chapterTotal;
      const bump = async (n = 1) => {
        done += n;
        await store.setProgress(uploadId, Math.min(done, total()), total());
      };
      await bump(0);

      // 2. Ước lượng cả lượt trước khi tiêu token nào: chắc chắn không đủ thì dừng ngay, không tốn gì
      const need = estimateTokens({ figurePages: figureTodo.length, pages: unassigned.length });
      if ((await ledger.status(upload.userId, deps.now())).remaining < need) throw new MaterialQuotaError(await ledger.availableAt(upload.userId, need, deps.now()));

      const call = async (req: MaterialClaudeRequest, reserve: number) => {
        if (!(await store.exists(uploadId))) throw new Cancelled();
        const status = await ledger.status(upload.userId, deps.now());
        if (status.remaining < reserve) throw new MaterialQuotaError(await ledger.availableAt(upload.userId, reserve, deps.now()));
        const res = await client.call(req);
        await ledger.record(upload.userId, res.usage); // ghi ngay cả khi kết quả không dùng được (token đã tiêu)
        return res;
      };

      // 3. Mô tả trang hình, 2 trang cùng lúc; mỗi lần chỉ vẽ một trang (không giữ ảnh của cả tài liệu)
      if (figureTodo.length) {
        const pdf = await openPdf();
        await runPool(figureTodo, MATERIAL_VISION_CONCURRENCY, async (page) => {
          await yieldToEventLoop();
          const figure = await describeFigure(call, page, Buffer.from(await pdf.renderPng(page.pageNo)).toString("base64"));
          // Không mô tả được (kết quả hỏng cả hai lần): coi như trang chữ để không thử lại mãi
          await store.saveFigure(uploadId, page.pageNo, figure ? page.kind : "text", figure as unknown as Prisma.InputJsonValue | null);
          await bump();
        });
      }
      await closePdf(); // từ đây không cần tệp gốc nữa

      // 4. Gán chương theo lô
      const chapterNumbers = chapters.map((c) => c.number);
      for (const batch of chunk(unassigned, MATERIAL_ASSIGN_BATCH)) {
        const pageNos = batch.map((p) => p.pageNo);
        const res = await call(
          {
            model: MATERIAL_TEXT_MODEL,
            maxTokens: MATERIAL_ASSIGN_MAX_TOKENS,
            system: ASSIGN_SYSTEM,
            schema: ASSIGN_SCHEMA,
            content: assignContent(subject.name, chapters, batch.map((p) => ({ pageNo: p.pageNo, text: p.text, figureSummary: figureOf(p)?.summary ?? null }))),
          },
          MATERIAL_CALL_RESERVE_TOKENS.assign,
        );
        const parsed = parseAssignments(res.text, pageNos, chapterNumbers);
        if (!parsed) deps.log(`[material] upload ${uploadId}: kết quả gán chương không hợp lệ, ${pageNos.length} trang để chưa xếp`);
        await store.saveAssignments(uploadId, parsed ?? new Map(pageNos.map((n) => [n, null])));
        await bump();
      }

      // 5. Tóm tắt từng chương có trang
      pages = await store.pages(uploadId);
      const byChapter = new Map<number, PageRow[]>();
      for (const p of pages) if (p.chapterNumber !== null) byChapter.set(p.chapterNumber, [...(byChapter.get(p.chapterNumber) ?? []), p]);
      chapterTotal = byChapter.size;
      done = 1 + visionTotal + assignTotal + [...doneChapters].filter((n) => byChapter.has(n)).length;
      await bump(0);
      for (const chapter of chapters) {
        const own = byChapter.get(chapter.number);
        if (!own || doneChapters.has(chapter.number)) continue;
        const perPage = Math.min(MATERIAL_PAGE_TEXT_MAX, Math.floor(MATERIAL_CHAPTER_INPUT_MAX_CHARS / own.length));
        const req: MaterialClaudeRequest = {
          model: MATERIAL_TEXT_MODEL,
          maxTokens: MATERIAL_CHAPTER_MAX_TOKENS,
          system: CHAPTER_SYSTEM,
          schema: CHAPTER_SCHEMA,
          content: chapterContent(chapter, own.map((p) => ({ pageNo: p.pageNo, text: p.text, figure: pickFigure(figureOf(p)) })), perPage),
        };
        const allowed = own.map((p) => p.pageNo);
        let result = parseChapterSummary((await call(req, MATERIAL_CALL_RESERVE_TOKENS.chapter)).text, allowed);
        if (!result) result = parseChapterSummary((await call(req, MATERIAL_CALL_RESERVE_TOKENS.chapter)).text, allowed); // thử lại một lần
        if (!result) throw new MaterialUserError(MATERIAL_MESSAGES.summaryFailed);
        await store.saveChapter(uploadId, chapter.number, result.summary, result.keyPoints as unknown as Prisma.InputJsonValue);
        await bump();
      }

      await store.finish(uploadId, "DONE", null, deps.now());
      return "DONE";
    } catch (err) {
      if (err instanceof Cancelled) {
        deps.log(`[material] upload ${uploadId}: đã bị xoá, dừng`);
        return "CANCELLED";
      }
      const message =
        err instanceof MaterialQuotaError
          ? quotaMessage(err.at)
          : err instanceof MaterialUserError
            ? err.message
            : err instanceof PdfRenderUnavailableError
              ? MATERIAL_MESSAGES.renderUnavailable
              : MATERIAL_MESSAGES.generic;
      if (!(err instanceof MaterialUserError || err instanceof MaterialQuotaError)) deps.log(`[material] upload ${uploadId} lỗi: ${err instanceof Error ? err.message : String(err)}`);
      await store.finish(uploadId, "FAILED", message, deps.now()).catch(() => undefined); // tài liệu vừa bị xoá thì không còn gì để ghi
      return "FAILED";
    } finally {
      await closePdf().catch((e: Error) => deps.log(`[material] upload ${uploadId}: không xoá được tệp tạm: ${e.message}`));
    }
  };
}

const yieldToEventLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

type Caller = (req: MaterialClaudeRequest, reserve: number) => Promise<{ text: string }>;

/** Haiku trước; không chắc (hoặc kết quả hỏng) thì gọi Sonnet và dùng kết quả của Sonnet nếu đọc được. */
async function describeFigure(call: Caller, page: PageRow, pngBase64: string): Promise<FigureResult | null> {
  const req = (model: string): MaterialClaudeRequest => ({
    model,
    maxTokens: MATERIAL_FIGURE_MAX_TOKENS,
    system: FIGURE_SYSTEM,
    schema: FIGURE_SCHEMA,
    content: figureContent(page.pageNo, page.text, pngBase64),
  });
  const first = parseFigure((await call(req(MATERIAL_VISION_MODEL), MATERIAL_CALL_RESERVE_TOKENS.figure)).text, MATERIAL_VISION_MODEL);
  if (first && !needsFallback(first)) return first;
  const second = parseFigure((await call(req(MATERIAL_FALLBACK_MODEL), MATERIAL_CALL_RESERVE_TOKENS.figure)).text, MATERIAL_FALLBACK_MODEL);
  return second ?? first;
}

export const figureOf = (p: Pick<PageRow, "figure">): FigureResult | null => {
  const f = p.figure as Partial<FigureResult> | null;
  return f && typeof f === "object" && typeof f.summary === "string" ? (f as FigureResult) : null;
};

const pickFigure = (f: FigureResult | null) => (f ? { type: f.type, summary: f.summary, components: f.components, relationships: f.relationships } : null);

// ---------- Hàng đợi trong tiến trình ----------

let enqueuedListener: (() => void) | null = null;

const defaultDeps: MaterialJobDeps = {
  store: materialRepository,
  async subject(subjectId) {
    const [subject, chapters] = await Promise.all([subjectRepository.findById(subjectId), subjectRepository.chapters(subjectId)]);
    return subject ? { name: subject.name, chapters } : null;
  },
  async client() {
    const config = await aiSettingService.get();
    return aiReady(config) ? createMaterialClaudeClient(config.anthropicApiKey) : null;
  },
  ledger: materialTokenLedger,
  pdf: pdfjsEngine,
  files: materialTempFiles,
  now: () => new Date(),
  log: (m) => console.log(m),
};

export interface CleanupSummary {
  expired: number;
  orphanFiles: number;
  usageRows: number; // dòng sổ token đã quá cửa sổ (không còn tính vào giới hạn)
}

export const materialJobService = {
  process: createMaterialJob(defaultDeps),

  /** Worker đăng ký để được gọi khi có tài liệu mới vào hàng đợi. */
  onEnqueued(listener: () => void) {
    enqueuedListener = listener;
  },
  notifyEnqueued() {
    enqueuedListener?.();
  },

  claimNext: (): Promise<MaterialUploadRow | null> => materialRepository.claimNext(),
  requeueRunning: () => materialRepository.requeueRunning(),

  /** Dọn hằng ngày: xoá tài liệu quá hạn lưu (kèm trang, chương) và tệp tạm không thuộc job nào đang chờ/chạy. */
  async cleanup(now = new Date(), files: MaterialTempFiles = materialTempFiles): Promise<CleanupSummary> {
    const expired = await materialRepository.deleteExpired(now);
    const usageRows = await aiTokenUsageRepository.deleteBefore(new Date(now.getTime() - AI_TOKEN_USAGE_KEEP_MS));
    const active = new Set(await materialRepository.activeIds());
    let orphanFiles = 0;
    for (const f of await files.list()) {
      if (f.uploadId !== null && active.has(f.uploadId)) continue;
      if (now.getTime() - f.mtimeMs < MATERIAL_ORPHAN_FILE_MAX_AGE_MS) continue; // vừa ghi: có thể job đang được tạo
      await files.removeByName(f.name);
      orphanFiles++;
    }
    return { expired, orphanFiles, usageRows };
  },
};
