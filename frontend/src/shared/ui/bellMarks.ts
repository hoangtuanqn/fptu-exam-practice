// Logic thuần của chuông thông báo (không phụ thuộc React) để kiểm tra riêng được: scripts/check-bell.mjs

// Chỉ đường dẫn trong trang ("/..."), không nhận "//host" hay "/\host" dẫn ra ngoài (trùng luật của server)
const INTERNAL_LINK = /^\/(?![/\\])\S*$/;
export const internalLink = (link: string | null | undefined) =>
  link && INTERNAL_LINK.test(link) ? link : null;

/** Những thông báo đã hiện trong danh sách xổ ra, còn chưa đọc và chưa được gửi đánh dấu: đóng danh sách thì đánh dấu đã đọc. */
export function idsToMark(
  shown: readonly { id: string; readAt: string | null }[],
  sent: ReadonlySet<string>,
): string[] {
  return shown
    .filter((n) => n.readAt === null && !sent.has(n.id))
    .map((n) => n.id);
}
