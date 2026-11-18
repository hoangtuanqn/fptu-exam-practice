import { threadUrl } from "./fuo-url";

/**
 * Bài FE của danh mục chưa có trong danh sách link: bài chưa có đề thành link mới (NEW, lượt nạp sẽ lấy),
 * bài đã có đề thì ghi là đã xử lý lúc này (DONE) để không tải lại; lần sau bài đó đổi trên FuOverflow thì lượt nạp mới cập nhật.
 */
export const catalogSourceRows = (found: { threadId: string; examId: string | null }[], now: Date) =>
  found.map(({ threadId, examId }) => ({ threadId, url: threadUrl(threadId), ...(examId && { status: "DONE" as const, examId, processedAt: now }) }));
