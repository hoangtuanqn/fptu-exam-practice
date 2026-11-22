import type { FuoSourceRun, FuoSourceStatus } from "@prisma/client";
import { FUO_SOURCE_INSERT_CHUNK } from "../constants/fuo-source";
import { crawlJobRepository } from "../repositories/crawl-job.repository";
import { fuoCatalogRepository } from "../repositories/fuo-catalog.repository";
import { fuoSourceRepository } from "../repositories/fuo-source.repository";
import { parseSourceLines } from "../utils/fuo-source-lines";
import { type PaginationQuery, toMeta } from "../utils/pagination";
import { anonFuoLimiter } from "./crawler/fuo-anon-client";
import { FUO_AUTH_MESSAGE, FuoAuthError } from "./crawler/fuo-client";
import { fuoSessionService } from "./crawler/fuo-session.service";
import { crawlerSettingService } from "./crawler-setting.service";
import { examImportService } from "./exam-import.service";
import { examMergeService } from "./exam-merge.service";
import { fuoCatalogService } from "./fuo-catalog.service";

const STATUSES: FuoSourceStatus[] = ["NEW", "QUEUED", "RUNNING", "DONE", "FAILED"];
const noop = async () => undefined;
const listeners: (() => void)[] = [];
const SCAN_SHOWN = ["RUNNING", "NEEDS_AUTH", "FAILED", "DONE"]; // lượt quét của "Load dữ liệu mới" hiện ở trang nguồn đề (đang chạy, dừng, hoặc kết quả lần gần nhất)

const toRunDto = (run: FuoSourceRun, running: number) => ({
  id: run.id,
  status: run.status,
  total: run.total,
  done: run.done,
  failed: run.failed,
  running,
  imported: run.imported,
  updated: run.updated,
  lastError: run.lastError,
  createdAt: run.createdAt,
  finishedAt: run.finishedAt,
});

/**
 * Danh sách link đề FuOverflow của admin và lượt "nạp dữ liệu mới" (chạy nền ở jobs/fuo-source.worker, cần cookie FuOverflow).
 * Nút "Load dữ liệu mới" giờ chỉ quét danh mục (ẩn danh) để ghi tên đề mới; lượt nạp chỉ bắt đầu qua startImport.
 * Đề chưa có: nhập qua đúng luồng lấy đề (examImportService, kể cả việc nhờ AI giải như mọi đề mới).
 * Đề đã có: cập nhật êm qua examMergeService (chỉ thêm, không gọi AI).
 */
export const fuoSourceService = {
  async add(text: string) {
    const { accepted, rejected, duplicates } = parseSourceLines(text);
    let added = 0;
    for (let i = 0; i < accepted.length; i += FUO_SOURCE_INSERT_CHUNK) {
      const chunk = accepted.slice(i, i + FUO_SOURCE_INSERT_CHUNK).map(({ threadId, url }) => ({ threadId, url }));
      added += (await fuoSourceRepository.addMany(chunk)).count;
    }
    return { accepted: accepted.length, added, existing: accepted.length - added, duplicates, rejected };
  },

  async list(query: PaginationQuery, status?: FuoSourceStatus) {
    const [items, total] = await fuoSourceRepository.list(query, status);
    return { items, meta: toMeta(query, total) };
  },

  async status() {
    const [latest, groups, latestScan] = await Promise.all([fuoSourceRepository.findLatestRun(), fuoSourceRepository.countByStatus(), fuoCatalogRepository.findLatestRun()]);
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<FuoSourceStatus, number>;
    for (const g of groups) counts[g.status] = g._count._all;
    const total = STATUSES.reduce((n, s) => n + counts[s], 0);
    // Lượt quét thủ công ở trang danh mục đang chạy cũng hiện (nút đang bị khoá); lượt dừng/lỗi chỉ hiện với lượt của nút này
    const scanRun = latestScan && SCAN_SHOWN.includes(latestScan.status) && (latestScan.autoImport || latestScan.status === "RUNNING") ? latestScan : null;
    const [newBySubject, subjectsWithNew] = scanRun ? await fuoCatalogRepository.findNewBySubject(scanRun.id) : [[], 0];
    const cooldownUntil = anonFuoLimiter.state().cooldownUntil;
    const scan = scanRun && {
      status: scanRun.status,
      subjectsTotal: scanRun.subjectsTotal,
      subjectsDone: scanRun.subjectsDone,
      subjectsFailed: scanRun.subjectsFailed,
      currentSubject: (await fuoCatalogRepository.findRunningSubject(scanRun.id))?.code ?? null,
      threadsNew: scanRun.threadsNew,
      threadsUpdated: scanRun.threadsUpdated,
      lastError: scanRun.lastError,
      finishedAt: scanRun.finishedAt,
      newBySubject, // môn có đề mới ở lượt này (nhiều nhất trước), tối đa FUO_CATALOG_NEW_SUBJECTS_SHOWN
      subjectsWithNew, // tổng số môn có đề mới
      coolingDownUntil: scanRun.status === "RUNNING" && cooldownUntil > Date.now() ? new Date(cooldownUntil) : null, // FuOverflow đang hạn chế: tạm nghỉ tới lúc này
    };
    return { run: latest ? toRunDto(latest, counts.RUNNING) : null, counts: { total, ...counts }, scan };
  },

  /**
   * "Load dữ liệu mới" (trả về ngay, chạy nền): quét tăng dần danh mục FuOverflow mọi môn bằng client ẩn danh, chỉ ghi tên/thông tin
   * đề mới vào kho đề (fuo_threads); không tải hay nạp đề. Đang có lượt nạp hoặc lượt quét chạy thì trả trạng thái (started=false).
   */
  async start(adminId: string) {
    const started = !(await fuoSourceRepository.findActiveRun()) && (await fuoCatalogService.begin(adminId, true));
    listeners.forEach((fn) => fn()); // đánh thức worker (kể cả khi lượt đang chạy bị kẹt vì lỗi DB trước đó)
    return { started, ...(await this.status()) };
  },

  /** Sau lượt quét của "Load dữ liệu mới": ghi các bài FE của danh mục đã có đề vào danh sách link (không bắt đầu lượt nạp). */
  afterScan: () => fuoSourceRepository.addCatalogThreads(),

  /**
   * Bắt đầu lượt nạp (link mới, link lỗi, link có bài đã đổi; cần cookie FuOverflow). Lượt gần nhất dừng vì cần đăng nhập thì chạy
   * tiếp lượt đó. Hiện chưa có nút nào gọi: "Load dữ liệu mới" không còn tự nạp vì việc tải đề cần đăng nhập.
   */
  async startImport(adminId: string | null) {
    await fuoSourceRepository.addCatalogThreads();
    if (!(await fuoSourceRepository.findActiveRun())) {
      const latest = await fuoSourceRepository.findLatestRun();
      await (latest?.status === "NEEDS_AUTH" ? fuoSourceRepository.resumeRun(latest.id) : fuoSourceRepository.createRun(adminId)); // null: lượt khác vừa tạo
    }
    listeners.forEach((fn) => fn());
  },

  // Một link của lượt nạp. Lỗi đăng nhập FuOverflow (sau khi đã thử đăng nhập lại) được ném ra để worker dừng lượt.
  // `commentsAt`: lần gần nhất một lượt nạp đã lấy bình luận của thread (đề có sẵn chỉ lấy lại khi quá hạn hoặc có câu mới).
  process: (threadId: string, createdById: string | null, commentsAt: Date | null) =>
    fuoSessionService.withSession(async () => {
      if (!(await crawlerSettingService.get()).cookie) throw new Error(FUO_AUTH_MESSAGE, { cause: new FuoAuthError("no cookie") });
      const merged = await examMergeService.merge(threadId, commentsAt);
      if (merged) return { examId: merged.examId, result: merged.result, addedQuestions: merged.addedQuestions, commentsRefreshed: merged.commentsRefreshed };
      const { examId } = await examImportService.run({ threadId, refresh: false, userId: createdById }, { onReady: noop, onStage: noop });
      return { examId, result: "IMPORTED" as const, addedQuestions: 0, commentsRefreshed: true }; // lấy đề mới đã lấy cả bình luận
    }),

  // Có job lấy đề của người dùng đang chờ/chạy: lượt nạp nhường FuOverflow cho họ
  userImportsWaiting: () => crawlJobRepository.hasActive(),

  // Worker đăng ký để được đánh thức khi admin bấm bắt đầu
  onStarted: (fn: () => void) => void listeners.push(fn),
};
