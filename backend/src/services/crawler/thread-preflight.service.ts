import * as cheerio from "cheerio";
import { threadUrl } from "../../utils/fuo-url";
import { crawlerSettingService } from "../crawler-setting.service";
import { createFuoClient } from "./fuo-client";
import { REQUIRED_LABEL, hasRequiredLabel } from "./thread-scraper.service";

/**
 * Kiểm tra bài trên FuOverflow TRƯỚC khi nhận tiền: bài có tồn tại không và có đúng nhãn "Đề Thi FE" không.
 * Trước đây lỗi nhãn chỉ lộ ra khi worker đọc thread, lúc đó đã trừ phí rồi phải hoàn lại.
 *
 * Chỉ đọc đúng 1 trang đầu của bài. Kết quả được nhớ một lúc và các lượt hỏi đồng thời dùng chung một lần đọc,
 * vì giao diện gọi kiểm tra ngay khi người dùng dán link.
 * Trả về `null` khi KHÔNG kết luận được (chưa có cookie, cookie hết hạn, FuOverflow lỗi/chậm): khi đó không chặn người dùng,
 * worker vẫn kiểm tra lại và hoàn phí nếu bài sai.
 */
export type ThreadPreflight = { ok: true; title: string } | { ok: false; message: string };

const OK_TTL_MS = 10 * 60_000;
const REJECT_TTL_MS = 5 * 60_000;
const CACHE_MAX = 500;

const cache = new Map<string, { at: number; result: ThreadPreflight }>();
const inflight = new Map<string, Promise<ThreadPreflight | null>>();

async function read(threadId: string): Promise<ThreadPreflight | null> {
  const config = await crawlerSettingService.get();
  if (!config.cookie) return null;
  let html: string;
  try {
    html = await (await createFuoClient(config).fetchOk(threadUrl(threadId))).text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (/HTTP (404|410)\b/.test(msg)) return { ok: false, message: "Không tìm thấy bài này trên FuOverflow (có thể đã bị xoá). Hãy kiểm tra lại link." };
    return null; // cookie hết hạn, mạng, FuOverflow lỗi: không kết luận
  }
  const $ = cheerio.load(html);
  if ($("h1.p-title-value").length === 0) return null; // không phải trang bài viết (trang đăng nhập/Cloudflare...): không kết luận
  if (!hasRequiredLabel(html)) {
    return { ok: false, message: `Chỉ lấy được các bài có nhãn "${REQUIRED_LABEL}". Bài này không có nhãn đó nên không thể lấy.` };
  }
  return { ok: true, title: $("h1.p-title-value").first().clone().find(".label, .labelLink").remove().end().text().replace(/\s+/g, " ").trim() };
}

export const threadPreflight = {
  async check(threadId: string): Promise<ThreadPreflight | null> {
    const hit = cache.get(threadId);
    if (hit && Date.now() - hit.at < (hit.result.ok ? OK_TTL_MS : REJECT_TTL_MS)) return hit.result;

    let p = inflight.get(threadId);
    if (!p) {
      p = read(threadId)
        .then((result) => {
          if (result) {
            if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
            cache.set(threadId, { at: Date.now(), result });
          }
          return result;
        })
        .catch(() => null)
        .finally(() => inflight.delete(threadId));
      inflight.set(threadId, p);
    }
    return p;
  },
};
