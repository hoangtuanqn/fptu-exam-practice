import type { CrawlerConfig } from "../constants/crawler";
import { FUO_SOURCE_FETCH_MISSING_DELAY_MS } from "../constants/fuo-source";
import { threadUrl } from "./fuo-url";

/**
 * Bài FE của danh mục đã có đề nhưng chưa có trong danh sách link: ghi là đã xử lý lúc này (DONE) để không tải lại;
 * lần sau bài đó đổi trên FuOverflow thì lượt nạp mới cập nhật. Bài chưa có đề không đi qua đây (chỉ lấy khi người dùng bấm).
 */
export const catalogSourceRows = (found: { threadId: string; examId: string | null }[], now: Date) =>
  found.map(({ threadId, examId }) => ({ threadId, url: threadUrl(threadId), ...(examId && { status: "DONE" as const, examId, processedAt: now }) }));

// "Lấy hết đề còn thiếu": 1 luồng, nghỉ ít nhất FUO_SOURCE_FETCH_MISSING_DELAY_MS giữa hai request (admin đặt chậm hơn thì giữ)
export const slowCrawlConfig = (config: CrawlerConfig): CrawlerConfig => ({
  ...config,
  concurrency: 1,
  requestDelayMs: Math.max(config.requestDelayMs, FUO_SOURCE_FETCH_MISSING_DELAY_MS),
});
