import type { FuoCatalogRun } from "@prisma/client";
import { FUO_CATALOG_MAX_PAGES, FUO_CATALOG_PAGE_PAUSE_MS } from "../constants/fuo-catalog";
import { HTTP_STATUS } from "../constants/httpStatus";
import { crawlJobRepository } from "../repositories/crawl-job.repository";
import { type CatalogThreadRow, fuoCatalogRepository } from "../repositories/fuo-catalog.repository";
import { fuoSourceRepository } from "../repositories/fuo-source.repository";
import { AppError } from "../rules/error";
import { EXAM_KINDS } from "../utils/exam-kind";
import { diffCatalogRows } from "../utils/fuo-catalog-diff";
import { sleep } from "../utils/sleep";
import { FUO_AUTH_MESSAGE, FuoAuthError, createFuoClient } from "./crawler/fuo-client";
import { type ForumRow, forumUrl, looksBlocked, parseForumPage } from "./crawler/fuo-forum.service";
import { fuoSessionService } from "./crawler/fuo-session.service";
import { MIN_SUBJECTS, URL_SUBJECTS, parseSubjectSemesters } from "./crawler/fuo-subjects.service";
import { crawlerSettingService } from "./crawler-setting.service";

const listeners: (() => void)[] = [];

const toRunDto = (run: FuoCatalogRun, currentSubject: string | null) => ({
  id: run.id,
  status: run.status,
  subjectsTotal: run.subjectsTotal,
  subjectsDone: run.subjectsDone,
  subjectsFailed: run.subjectsFailed,
  currentSubject,
  threadsFound: run.threadsFound,
  threadsNew: run.threadsNew,
  threadsUpdated: run.threadsUpdated,
  lastError: run.lastError,
  createdAt: run.createdAt,
  finishedAt: run.finishedAt,
});

/**
 * Lượt quét danh mục FuOverflow của admin (chạy nền ở jobs/fuo-catalog.worker): đọc danh sách môn ở mục "TÀI LIỆU CÁC MÔN HỌC",
 * rồi mọi trang của diễn đàn từng môn, ghi mọi bài (FE, PE, Quiz, khác) vào fuo_threads. Chỉ thông tin mô tả: ảnh/tệp của đề
 * chỉ được tải khi có người lấy đề. Bài biến mất trên FuOverflow không bị xoá. Request lần lượt, có nghỉ giữa các trang.
 */
export const fuoCatalogService = {
  async status() {
    const [latest, totals] = await Promise.all([fuoCatalogRepository.findLatestRun(), fuoCatalogRepository.totals()]);
    const [current, failures] = latest ? await Promise.all([fuoCatalogRepository.findRunningSubject(latest.id), fuoCatalogRepository.findFailedSubjects(latest.id)]) : [null, []];
    const byKind = Object.fromEntries(EXAM_KINDS.map((k) => [k, 0])) as Record<(typeof EXAM_KINDS)[number], number>;
    for (const g of totals.byKind) byKind[g.kind] = g.count;
    return {
      run: latest ? toRunDto(latest, current?.code ?? null) : null,
      failures: failures.map((f) => ({ code: f.code, error: f.lastError, at: f.crawledAt })),
      totals: { subjects: totals.subjects, threads: EXAM_KINDS.reduce((n, k) => n + byKind[k], 0), byKind },
    };
  },

  /** Bắt đầu lượt quét (trả về ngay, chạy nền). Lượt gần nhất dừng vì cần đăng nhập thì chạy tiếp lượt đó. */
  async start(adminId: string) {
    const busy = () => {
      listeners.forEach((fn) => fn()); // đánh thức worker (kể cả khi lượt đang chạy bị kẹt vì lỗi DB trước đó)
      return new AppError("Đang có lượt quét danh mục FuOverflow chạy. Hãy đợi lượt đó xong.", HTTP_STATUS.CONFLICT);
    };
    if (await fuoCatalogRepository.findActiveRun()) throw busy();
    const config = await crawlerSettingService.get();
    if (!config.cookie && !(config.loginEmail && config.loginPassword)) {
      throw new AppError("Chưa có cookie hay tài khoản FuOverflow. Hãy cập nhật ở Quản trị → Cấu hình lấy đề trước.", HTTP_STATUS.UNPROCESSABLE_ENTITY);
    }
    const latest = await fuoCatalogRepository.findLatestRun();
    const run = latest?.status === "NEEDS_AUTH" ? await fuoCatalogRepository.resumeRun(latest.id) : await fuoCatalogRepository.createRun(adminId);
    if (!run) throw busy(); // lần bấm khác vừa tạo lượt
    listeners.forEach((fn) => fn());
    return { started: true, ...(await this.status()) };
  },

  /** Một trang FuOverflow qua FuoClient (cookie/UA/thử lại). Trang Cloudflare/đăng nhập: lỗi phiên. Thay được trong test. */
  async fetchPage(url: string): Promise<{ html: string; url: string }> {
    const res = await createFuoClient(await crawlerSettingService.get()).fetchOk(url);
    const html = await res.text();
    if (looksBlocked(html)) throw new Error(FUO_AUTH_MESSAGE, { cause: new FuoAuthError(`blocked - ${url}`) });
    return { html, url: res.url || url };
  },

  // Nghỉ giữa hai trang liên tiếp (thay được trong test)
  pause: async () => sleep(Math.max((await crawlerSettingService.get()).requestDelayMs, FUO_CATALOG_PAGE_PAUSE_MS)),

  /** Mã mọi môn ở mục "TÀI LIỆU CÁC MÔN HỌC" (cả nhóm chưa rõ kỳ). */
  subjectCodes: () =>
    fuoSessionService.withSession(async () => {
      const { semesters, unknown } = parseSubjectSemesters((await fuoCatalogService.fetchPage(URL_SUBJECTS)).html);
      const codes = [...new Set([...semesters.keys(), ...unknown])].sort();
      if (codes.length < MIN_SUBJECTS) throw new Error(`Chỉ đọc được ${codes.length} môn, có thể FuOverflow đã đổi giao diện trang`);
      return codes;
    }),

  /** Mọi bài của một môn: trang 1, đọc số trang cuối, rồi các trang còn lại (lần lượt). Bài trùng giữa các trang chỉ tính một lần. */
  crawlSubject: (code: string) =>
    fuoSessionService.withSession(async () => {
      const first = await fuoCatalogService.fetchPage(forumUrl(code));
      const page1 = parseForumPage(first.html);
      if (!page1.isForum) throw new Error(`Trang của môn ${code} không phải danh sách bài (có thể môn không còn trên FuOverflow)`);
      // XenForo có thể chuyển /forums/PRO192/ sang địa chỉ khác: các trang sau dựng từ địa chỉ cuối cùng
      const base = first.url.replace(/[?#].*$/, "").replace(/\/page-\d+\/?$/, "").replace(/\/?$/, "/");
      const pages = Math.min(page1.lastPage, FUO_CATALOG_MAX_PAGES);
      const rows = new Map<string, ForumRow>(page1.rows.map((r) => [r.threadId, r]));
      for (let p = 2; p <= pages; p++) {
        await fuoCatalogService.pause();
        for (const r of parseForumPage((await fuoCatalogService.fetchPage(`${base}page-${p}`)).html).rows) if (!rows.has(r.threadId)) rows.set(r.threadId, r);
      }
      return { pages, rows: [...rows.values()] };
    }),

  /** Ghi kết quả một môn: chỉ bài mới hoặc đã đổi được ghi; trả về các con số mới của lượt. */
  async saveSubject(runId: string, subjectId: string, code: string, result: { pages: number; rows: ForumRow[] }) {
    const rows: CatalogThreadRow[] = result.rows.map((r) => ({ threadId: r.threadId, subjectCode: code, title: r.title, label: r.label, kind: r.kind, postedAt: r.postedAt, replies: r.replies }));
    const { added, changed } = diffCatalogRows(await fuoCatalogRepository.findThreads(rows.map((r) => r.threadId)), rows);
    return fuoCatalogRepository.saveSubject(runId, subjectId, { added, changed, found: rows.length, pages: result.pages });
  },

  // Job lấy đề của người dùng đang chờ/chạy hoặc lượt nạp dữ liệu đang chạy: nhường FuOverflow cho họ (mỗi lúc chỉ một luồng request)
  busy: async () => (await crawlJobRepository.hasActive()) || (await fuoSourceRepository.findActiveRun()) !== null,

  // Worker đăng ký để được đánh thức khi admin bấm bắt đầu
  onStarted: (fn: () => void) => void listeners.push(fn),
};
