import { useMemo } from "react";
import { useAuth } from "@/features/auth/AuthContext";

// Lớp chữ chìm chéo gắn mã tài khoản phủ lên ảnh đề, vẽ ngay trên trình duyệt (không xử lý ảnh trên máy chủ, không tạo ảnh riêng cho từng người).
// Ảnh chụp màn hình hoặc ảnh lưu lại từ trang đều mang theo lớp này; mã là 8 ký tự cuối của ID tài khoản nên không lộ email,
// admin tra ngược được từ mã. Chữ rất mờ (không che nội dung đề) nhưng kéo tương phản trong trình sửa ảnh là hiện rõ.
// shortcut: người dùng mở devtools xoá được phần tử này; cần chặn hẳn thì phải đóng dấu ở máy chủ (tốn CPU theo từng lượt xem).

const GUEST_KEY = "fepass_guest_code";
const TILE_W = 300;
const TILE_H = 200;

const randomCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();

// Khách chưa đăng nhập: mã ngẫu nhiên giữ trong trình duyệt, để một người vẫn có cùng mã giữa các lần xem
function guestCode() {
  try {
    let code = localStorage.getItem(GUEST_KEY);
    if (!code) {
      code = randomCode();
      localStorage.setItem(GUEST_KEY, code);
    }
    return code;
  } catch {
    return randomCode();
  }
}

export function useWatermarkCode() {
  const { user } = useAuth();
  return useMemo(() => (user ? user.id.slice(-8).toUpperCase() : guestCode()), [user]);
}

const tileOf = (code: string) => {
  const text = `FEPass · ${code}`;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE_W}" height="${TILE_H}">` +
    `<text x="${TILE_W / 2}" y="${TILE_H / 2}" text-anchor="middle" transform="rotate(-28 ${TILE_W / 2} ${TILE_H / 2})" ` +
    `font-family="Arial, sans-serif" font-size="14" font-weight="600" fill="#000" fill-opacity="0.09">${text}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
};

/** Đặt bên trong khung `relative` bọc ảnh; không nhận chuột nên bấm vào ảnh vẫn hoạt động bình thường. */
export function ImageWatermark() {
  const code = useWatermarkCode();
  return <span aria-hidden className="pointer-events-none absolute inset-0 select-none" style={{ backgroundImage: tileOf(code), backgroundSize: `${TILE_W}px ${TILE_H}px` }} />;
}
