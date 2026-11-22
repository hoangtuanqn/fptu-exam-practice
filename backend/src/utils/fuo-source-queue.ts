import type { CrawlerConfig } from "../constants/crawler";
import { FUO_SOURCE_FETCH_MISSING_IMAGE_CONCURRENCY, FUO_SOURCE_FETCH_MISSING_DELAY_MS } from "../constants/fuo-source";
import { threadUrl } from "./fuo-url";

/**
 * Bài FE của danh mục đã có đề nhưng chưa có trong danh sách link: ghi là đã xử lý lúc này (DONE) để không tải lại;
 * lần sau bài đó đổi trên FuOverflow thì lượt nạp mới cập nhật. Bài chưa có đề không đi qua đây (chỉ lấy khi người dùng bấm).
 */
export const catalogSourceRows = (found: { threadId: string; examId: string | null }[], now: Date) =>
  found.map(({ threadId, examId }) => ({ threadId, url: threadUrl(threadId), ...(examId && { status: "DONE" as const, examId, processedAt: now }) }));

// "Lấy hết đề còn thiếu": ảnh trong một đề tải song song (FUO_SOURCE_FETCH_MISSING_IMAGE_CONCURRENCY); nghỉ giữa request lấy theo cấu hình admin nếu lớn hơn FUO_SOURCE_FETCH_MISSING_DELAY_MS
export const slowCrawlConfig = (config: CrawlerConfig): CrawlerConfig => ({
  ...config,
  concurrency: FUO_SOURCE_FETCH_MISSING_IMAGE_CONCURRENCY,
  requestDelayMs: Math.max(config.requestDelayMs, FUO_SOURCE_FETCH_MISSING_DELAY_MS),
});
