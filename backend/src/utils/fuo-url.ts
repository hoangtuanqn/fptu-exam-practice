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

/** Đúng domain FuOverflow hoặc subdomain của nó (không nhận tên giả dạng như fuoverflow.com.evil.example). */
export const isFuoHostname = (hostname: string) => hostname === FUO_HOST || hostname.endsWith(`.${FUO_HOST}`);

/** Link https tới FuOverflow: chỉ những link này mới được gửi kèm cookie admin khi tải tệp. */
export function isFuoHttpsUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && isFuoHostname(hostname);
  } catch {
    return false;
  }
}

/** Link thread hợp lệ của FuOverflow: http(s), đúng domain (hoặc subdomain) và có ID thread. Dùng chung cho mọi chỗ nhận link. */
export function isFuoThreadUrl(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return (protocol === "https:" || protocol === "http:") && isFuoHostname(hostname) && parseThreadId(url) !== null;
  } catch {
    return false;
  }
}

/** Link sạch để crawl: chỉ phụ thuộc ID, bỏ mọi tham số người dùng gửi lên. */
export const threadUrl = (threadId: string) => `https://${FUO_HOST}/threads/${threadId}/`;
