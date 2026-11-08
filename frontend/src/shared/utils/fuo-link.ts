// Kiểm tra nhanh link thread FuOverflow ngay trên trình duyệt (cùng quy tắc với backend: utils/fuo-url.ts)
// để báo lỗi tức thì khi người dùng gõ/dán, khỏi phải bấm "Lấy đề" mới biết. Backend vẫn kiểm tra lại.
export const FUO_HOST = "fuoverflow.com";

// Link thread từ mã bài: dùng khi chọn đề trong danh sách (Kho đề, tải đề PE...) thay vì tự ghép chuỗi ở từng nơi
export const fuoThreadUrl = (threadId: string) => `https://${FUO_HOST}/threads/${threadId}/`;

export type FuoLinkCheck = { ok: true; threadId: string } | { ok: false; message: string };

export function checkFuoLink(raw: string): FuoLinkCheck {
  const link = raw.trim();
  if (!link) return { ok: false, message: "" };
  if (link.length > 500) return { ok: false, message: "Link quá dài" };
  if (/\s/.test(link)) return { ok: false, message: "Link không được chứa khoảng trắng, hãy dán đúng một link" };

  let url: URL;
  try {
    url = new URL(link);
  } catch {
    return { ok: false, message: /^[\w.-]+\.[a-z]{2,}\//i.test(link) ? "Link cần bắt đầu bằng https://" : "Đây chưa phải là một đường link" };
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return { ok: false, message: "Link cần bắt đầu bằng https://" };
  if (url.hostname !== FUO_HOST && !url.hostname.endsWith(`.${FUO_HOST}`)) return { ok: false, message: `Chỉ nhận link của ${FUO_HOST}` };

  const threadId = url.pathname.match(/^\/threads\/(?:[^/]*\.)?(\d{1,18})(?:\/|$)/)?.[1];
  if (!threadId) return { ok: false, message: "Link phải là một bài đề thi, dạng fuoverflow.com/threads/ten-de.1234/" };
  return { ok: true, threadId };
}
