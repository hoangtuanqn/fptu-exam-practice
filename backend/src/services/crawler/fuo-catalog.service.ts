import * as cheerio from "cheerio";
import { FUO_HOST } from "../../constants/crawler";
import { sleep } from "../../utils/sleep";

/**
 * Danh mục đề của một môn trên FuOverflow: đọc /forums/<MÃ MÔN>/ rồi lần lượt các trang page-2, page-3...
 * Đây là trang công khai (không cần cookie). Kết quả nhớ trong bộ nhớ một lúc để nhiều người hỏi cùng môn không làm
 * phiền FuOverflow, và các lượt hỏi đồng thời cùng môn dùng chung một lần đọc.
 */

export interface FuoThread {
  title: string;
  prefix: string; // "Đề Thi FE", "Đề Thi PE"... (rỗng nếu bài không gắn nhãn)
  url: string;
  threadId: string;
  postedAt: string | null; // ISO
  replies: number;
}

export interface FuoSubjectExams {
  subject: string;
  forumUrl: string;
  pages: number;
  truncated: boolean; // true nếu môn có nhiều trang hơn mức đọc tối đa
  fetchedAt: number;
  threads: FuoThread[];
}

const BASE = `https://${FUO_HOST}`;
const SUBJECT_CODE = /^[A-Za-z0-9]{2,12}$/;
const MAX_PAGES = 15; // ~20 bài mỗi trang; môn nhiều đề nhất cũng chưa tới mức này
const PAGE_DELAY_MS = 350; // nghỉ giữa hai trang liên tiếp
const TIMEOUT_MS = 15_000;
const TTL_MS = 30 * 60_000;
const NEG_TTL_MS = 5 * 60_000; // môn không tồn tại cũng nhớ ngắn hạn để khỏi hỏi lại liên tục
const CACHE_MAX = 200;
const UA = "Mozilla/5.0 (compatible; FEPassBot/1.0; +https://fepass.top)";

export class FuoSubjectNotFound extends Error {}

const done = new Map<string, FuoSubjectExams | FuoSubjectNotFound>();
const stamp = new Map<string, number>();
const inflight = new Map<string, Promise<FuoSubjectExams>>();

/** Chuẩn hoá mã môn người dùng gõ ("pro 192", "Pro192 ") thành "PRO192"; null nếu không hợp lệ. */
export function normalizeSubject(raw: string): string | null {
  const code = raw.replace(/[\s_-]+/g, "").toUpperCase();
  return SUBJECT_CODE.test(code) ? code : null;
}

async function getHtml(url: string): Promise<string | null> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "user-agent": UA, "accept-language": "vi,en;q=0.8" }, redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
      if (res.status === 404) return null;
      if (res.ok) return await res.text();
      if (![429, 500, 502, 503, 504].includes(res.status) || attempt >= 3) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      if (attempt >= 3) throw err;
    }
    await sleep(attempt * 800);
  }
}

/** Các bài (thread) trong một trang danh sách + số trang lớn nhất đang hiển thị ở thanh phân trang. */
export function parseForumPage(html: string): { threads: FuoThread[]; lastPage: number } {
  const $ = cheerio.load(html);
  const threads: FuoThread[] = [];
  $(".structItem--thread").each((_, el) => {
    const $el = $(el);
    const a = $el.find(".structItem-title > a[href*='/threads/']").last();
    const href = a.attr("href") ?? "";
    const id = href.match(/\/threads\/(?:[^/]*\.)?(\d{1,18})(?:\/|$)/)?.[1];
    const title = a.text().replace(/\s+/g, " ").trim();
    if (!id || !title) return;
    const replies = Number($el.find(".structItem-cell--meta dd").first().text().replace(/\D/g, "")) || 0;
    threads.push({
      title,
      prefix: $el.find(".structItem-title .label").first().text().replace(/\s+/g, " ").trim(),
      url: `${BASE}/threads/${id}/`,
      threadId: id,
      postedAt: $el.find(".structItem-startDate time").attr("datetime") ? new Date($el.find(".structItem-startDate time").attr("datetime")!).toISOString() : null,
      replies,
    });
  });
  let lastPage = 1;
  $(".pageNav-main a").each((_, el) => {
    const n = Number($(el).attr("href")?.match(/page-(\d+)/)?.[1] ?? $(el).text());
    if (Number.isInteger(n) && n > lastPage) lastPage = n;
  });
  return { threads, lastPage };
}

async function crawl(subject: string): Promise<FuoSubjectExams> {
  const forumUrl = `${BASE}/forums/${subject}/`;
  const first = await getHtml(forumUrl);
  if (first === null) throw new FuoSubjectNotFound(subject);
  const page1 = parseForumPage(first);
  const lastPage = Math.min(page1.lastPage, MAX_PAGES);
  const byId = new Map(page1.threads.map((t) => [t.threadId, t]));
  for (let p = 2; p <= lastPage; p++) {
    await sleep(PAGE_DELAY_MS);
    const html = await getHtml(`${forumUrl}page-${p}`);
    if (html === null) break;
    for (const t of parseForumPage(html).threads) byId.set(t.threadId, t); // khử trùng (bài mới đẩy bài cũ sang trang sau)
  }
  return { subject, forumUrl, pages: lastPage, truncated: page1.lastPage > MAX_PAGES, fetchedAt: Date.now(), threads: [...byId.values()] };
}

export const fuoCatalogService = {
  /** Toàn bộ đề của môn (tất cả các trang). Ném FuoSubjectNotFound nếu FuOverflow không có môn này. */
  async examsOf(subject: string): Promise<FuoSubjectExams> {
    const hit = done.get(subject);
    if (hit && Date.now() - (stamp.get(subject) ?? 0) < (hit instanceof FuoSubjectNotFound ? NEG_TTL_MS : TTL_MS)) {
      if (hit instanceof FuoSubjectNotFound) throw hit;
      return hit;
    }
    let p = inflight.get(subject);
    if (!p) {
      p = crawl(subject)
        .then((r) => {
          if (done.size >= CACHE_MAX) done.delete(done.keys().next().value!);
          done.set(subject, r);
          stamp.set(subject, Date.now());
          return r;
        })
        .catch((err) => {
          if (err instanceof FuoSubjectNotFound) {
            done.set(subject, err);
            stamp.set(subject, Date.now());
          }
          throw err;
        })
        .finally(() => inflight.delete(subject));
      inflight.set(subject, p);
    }
    return p;
  },
};
