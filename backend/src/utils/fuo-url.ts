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

/** Link thread hợp lệ của FuOverflow: http(s), đúng domain (hoặc subdomain) và có ID thread. Dùng chung cho mọi chỗ nhận link. */
export function isFuoThreadUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return (protocol === "https:" || protocol === "http:") && (hostname === FUO_HOST || hostname.endsWith(`.${FUO_HOST}`)) && parseThreadId(url) !== null;
  } catch {
    return false;
  }
}

/** Link sạch để crawl: chỉ phụ thuộc ID, bỏ mọi tham số người dùng gửi lên. */
export const threadUrl = (threadId: string) => `https://${FUO_HOST}/threads/${threadId}/`;
