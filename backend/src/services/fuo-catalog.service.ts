import type { FuoCatalogRun } from "@prisma/client";
import { FUO_CATALOG_INCREMENTAL_BATCH, FUO_CATALOG_MAX_PAGES } from "../constants/fuo-catalog";
import { HTTP_STATUS } from "../constants/httpStatus";
import { crawlJobRepository } from "../repositories/crawl-job.repository";
import { type CatalogThreadRow, fuoCatalogRepository } from "../repositories/fuo-catalog.repository";
import { fuoSourceRepository } from "../repositories/fuo-source.repository";
import { AppError } from "../rules/error";
import { EXAM_KINDS } from "../utils/exam-kind";
import { diffCatalogRows, pageHasNews } from "../utils/fuo-catalog-diff";
import { createAnonymousFuoClient } from "./crawler/fuo-anon-client";
import { type ForumRow, forumUrl, parseForumPage } from "./crawler/fuo-forum.service";
import { MIN_SUBJECTS, URL_SUBJECTS, parseSubjectSemesters } from "./crawler/fuo-subjects.service";

const listeners: (() => void)[] = [];

const toCatalogRow = (code: string, r: ForumRow): CatalogThreadRow => ({ threadId: r.threadId, subjectCode: code, title: r.title, label: r.label, kind: r.kind, postedAt: r.postedAt, replies: r.replies });

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
 * chỉ được tải khi có người lấy đề. Bài biến mất trên FuOverflow không bị xoá.
 * Chỉ đọc trang công khai bằng client ẩn danh (không cookie, không tài khoản, không đăng nhập); nhiều môn và nhiều trang chạy song song,
 * tốc độ do bộ giới hạn chung của client ẩn danh tự điều chỉnh (không nghỉ cố định).
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

  /** Bắt đầu lượt quét (trả về ngay, chạy nền). Lượt gần nhất dừng giữa chừng (NEEDS_AUTH của bản cũ) thì chạy tiếp lượt đó. */
  async start(adminId: string) {
    if (!(await this.begin(adminId, false))) throw new AppError("Đang có lượt quét danh mục FuOverflow chạy. Hãy đợi lượt đó xong.", HTTP_STATUS.CONFLICT);
    return { started: true, ...(await this.status()) };
  },

  /**
   * Tạo lượt quét (hoặc chạy tiếp lượt cùng loại đang dừng NEEDS_AUTH từ bản cũ) rồi đánh thức worker; false nếu đang có lượt chạy.
   * Không cần cookie hay tài khoản FuOverflow. `autoImport`: lượt của nút "Load dữ liệu mới" (quét tăng dần, chỉ ghi tên/thông tin
   * của đề mới, không tải hay nạp đề), khác lượt quét đầy đủ ở trang danh mục.
   */
  async begin(adminId: string, autoImport: boolean) {
    const wake = () => listeners.forEach((fn) => fn()); // đánh thức worker (kể cả khi lượt đang chạy bị kẹt vì lỗi DB trước đó)
    if (await fuoCatalogRepository.findActiveRun()) {
      wake();
      return false;
    }
    const latest = await fuoCatalogRepository.findLatestRun();
    const run = latest?.status === "NEEDS_AUTH" && latest.autoImport === autoImport ? await fuoCatalogRepository.resumeRun(latest.id) : await fuoCatalogRepository.createRun(adminId, autoImport);
    wake();
    return run !== null; // null: lần bấm khác vừa tạo lượt
  },

  /** Một trang FuOverflow qua client ẩn danh (thử lại, tự giảm tốc khi bị hạn chế). Trang cần đăng nhập: FuoLoginRequiredError. Thay được trong test. */
  async fetchPage(url: string): Promise<{ html: string; url: string }> {
    const res = await createAnonymousFuoClient().fetchOk(url);
    return { html: await res.text(), url: res.url || url };
  },

  /** Mã mọi môn ở mục "TÀI LIỆU CÁC MÔN HỌC" (cả nhóm chưa rõ kỳ). */
  async subjectCodes() {
    const { semesters, unknown } = parseSubjectSemesters((await fuoCatalogService.fetchPage(URL_SUBJECTS)).html);
    const codes = [...new Set([...semesters.keys(), ...unknown])].sort();
    if (codes.length < MIN_SUBJECTS) throw new Error(`Chỉ đọc được ${codes.length} môn, có thể FuOverflow đã đổi giao diện trang`);
    return codes;
  },

  /**
   * Mọi bài của một môn: trang 1 (để biết số trang), rồi các trang còn lại cùng lúc. Bài trùng giữa các trang chỉ tính một lần.
   * `incremental`: tải từng đợt FUO_CATALOG_INCREMENTAL_BATCH trang, xét theo thứ tự và dừng ở trang đầu tiên không có bài mới
   * hay đã đổi so với bản đã lưu (các trang sau trang đó không được tính; môn chưa quét lần nào thì vẫn đi hết).
   */
  async crawlSubject(code: string, opts: { incremental?: boolean } = {}) {
    const first = await fuoCatalogService.fetchPage(forumUrl(code));
    const page1 = parseForumPage(first.html);
    if (!page1.isForum) throw new Error(`Trang của môn ${code} không phải danh sách bài (có thể môn không còn trên FuOverflow)`);
    // XenForo có thể chuyển /forums/PRO192/ sang địa chỉ khác: các trang sau dựng từ địa chỉ cuối cùng
    const base = first.url.replace(/[?#].*$/, "").replace(/\/page-\d+\/?$/, "").replace(/\/?$/, "/");
    const pages = Math.min(page1.lastPage, FUO_CATALOG_MAX_PAGES);
    const rows = new Map<string, ForumRow>(page1.rows.map((r) => [r.threadId, r]));
    const unchanged = async (list: ForumRow[]) =>
      !!opts.incremental && !pageHasNews(await fuoCatalogRepository.findThreads(list.map((r) => r.threadId)), list.map((r) => toCatalogRow(code, r)));
    const batch = opts.incremental ? FUO_CATALOG_INCREMENTAL_BATCH : FUO_CATALOG_MAX_PAGES;
    for (let p = 2, stop = await unchanged(page1.rows); p <= pages && !stop; p += batch) {
      const numbers = Array.from({ length: Math.min(batch, pages - p + 1) }, (_, i) => p + i);
      const lists = await Promise.all(numbers.map(async (n) => parseForumPage((await fuoCatalogService.fetchPage(`${base}page-${n}`)).html).rows));
      for (const list of lists) {
        for (const r of list) if (!rows.has(r.threadId)) rows.set(r.threadId, r);
        if ((stop = await unchanged(list))) break;
      }
    }
    return { pages, rows: [...rows.values()] };
  },

  /** Ghi kết quả một môn: chỉ bài mới hoặc đã đổi được ghi; trả về các con số mới của lượt. */
  async saveSubject(runId: string, subjectId: string, code: string, result: { pages: number; rows: ForumRow[] }) {
    const rows = result.rows.map((r) => toCatalogRow(code, r));
    const { added, changed } = diffCatalogRows(await fuoCatalogRepository.findThreads(rows.map((r) => r.threadId)), rows);
    return fuoCatalogRepository.saveSubject(runId, subjectId, { added, changed, found: rows.length, pages: result.pages });
  },

  // Job lấy đề của người dùng đang chờ/chạy hoặc lượt nạp dữ liệu đang chạy: nhường FuOverflow cho họ (chưa nhận môn mới)
  busy: async () => (await crawlJobRepository.hasActive()) || (await fuoSourceRepository.findActiveRun()) !== null,

  // Worker đăng ký để được đánh thức khi admin bấm bắt đầu
  onStarted: (fn: () => void) => void listeners.push(fn),
};
