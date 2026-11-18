import type { FuoSourceRun, FuoSourceStatus } from "@prisma/client";
import { FUO_SOURCE_INSERT_CHUNK } from "../constants/fuo-source";
import { HTTP_STATUS } from "../constants/httpStatus";
import { crawlJobRepository } from "../repositories/crawl-job.repository";
import { fuoSourceRepository } from "../repositories/fuo-source.repository";
import { AppError } from "../rules/error";
import { parseSourceLines } from "../utils/fuo-source-lines";
import { type PaginationQuery, toMeta } from "../utils/pagination";
import { FUO_AUTH_MESSAGE, FuoAuthError } from "./crawler/fuo-client";
import { fuoSessionService } from "./crawler/fuo-session.service";
import { crawlerSettingService } from "./crawler-setting.service";
import { examImportService } from "./exam-import.service";
import { examMergeService } from "./exam-merge.service";

const STATUSES: FuoSourceStatus[] = ["NEW", "QUEUED", "RUNNING", "DONE", "FAILED"];
const noop = async () => undefined;
const listeners: (() => void)[] = [];

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
 * Danh sách link đề FuOverflow của admin và lượt "nạp dữ liệu mới" (chạy nền ở jobs/fuo-source.worker).
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
    const [latest, groups] = await Promise.all([fuoSourceRepository.findLatestRun(), fuoSourceRepository.countByStatus()]);
    const counts = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<FuoSourceStatus, number>;
    for (const g of groups) counts[g.status] = g._count._all;
    const total = STATUSES.reduce((n, s) => n + counts[s], 0);
    return { run: latest ? toRunDto(latest, counts.RUNNING) : null, counts: { total, ...counts } };
  },

  /**
   * Bắt đầu lượt nạp (trả về ngay, chạy nền). Đang có lượt chạy thì trả lượt đó (started=false), không tạo thêm.
   * Lượt gần nhất dừng vì cần đăng nhập FuOverflow thì chạy tiếp lượt đó thay vì làm lại từ đầu.
   */
  async start(adminId: string) {
    let started = false;
    if (!(await fuoSourceRepository.findActiveRun())) {
      if ((await fuoSourceRepository.countAll()) === 0) throw new AppError("Chưa có link nào để nạp. Hãy dán danh sách link trước.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
      const latest = await fuoSourceRepository.findLatestRun();
      const run = latest?.status === "NEEDS_AUTH" ? await fuoSourceRepository.resumeRun(latest.id) : await fuoSourceRepository.createRun(adminId);
      started = !!run; // null: một lần bấm khác vừa tạo/tiếp tục lượt
    }
    listeners.forEach((fn) => fn()); // đánh thức worker (kể cả khi lượt đang chạy bị kẹt vì lỗi DB trước đó)
    return { started, ...(await this.status()) };
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
