import { FUO_HOST } from "../constants/crawler";

/**
 * ID thread (chữ ký của đề) lấy từ link: /threads/pro192-su26-fe.7094/, /threads/7094/page-2?x=1...
 * Mọi biến thể link của cùng một đề đều ra cùng ID.
 */
export function parseThreadId(url: string): string | null {
  try {
    return new URL(url).pathname.match(/^\/threads\/(?:[^/]*\.)?(\d{1,18})(?:\/|$)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Link sạch để crawl: chỉ phụ thuộc ID, bỏ mọi tham số người dùng gửi lên. */
export const threadUrl = (threadId: string) => `https://${FUO_HOST}/threads/${threadId}/`;
