import path from "node:path";

// Thông tin hiện trong email. Giữ khớp với frontend/brand.config.ts
export const MAIL_BRAND = {
  company: "MST Software",
  product: "Luyện thi FE FPTU",
  tagline: "MMO Solution",
  founder: "Phạm Hoàng Tuấn",
  facebookUrl: "https://facebook.com/mstsoftware.vn",
  // Màu lấy từ BRAND.md
  blue: "#0066ff",
  navy: "#0b1730",
  cyan: "#00c8ff",
} as const;

// Ảnh banner nằm cạnh mã nguồn (backend/assets/mail), đúng cả khi chạy từ src/ lẫn dist/
export const MAIL_ASSETS_DIR = path.resolve(__dirname, "../../assets/mail");

// Mỗi loại thư một banner, nhúng thẳng vào thư bằng cid
export const MAIL_BANNERS = {
  reset: { file: "reset-banner.png", cid: "reset-banner@mst", alt: "Quên mật khẩu? Đặt lại chỉ trong vài bước" },
  welcome: { file: "welcome-banner.png", cid: "welcome-banner@mst", alt: "Chào mừng bạn" },
  security: { file: "security-banner.png", cid: "security-banner@mst", alt: "Bảo mật tài khoản" },
  order: { file: "order-banner.png", cid: "order-banner@mst", alt: "Lệnh nạp tiền đã tạo" },
  deposit: { file: "deposit-banner.png", cid: "deposit-banner@mst", alt: "Nạp tiền thành công" },
  charge: { file: "charge-banner.png", cid: "charge-banner@mst", alt: "Đã trừ phí lấy đề" },
} as const;

export type MailBanner = (typeof MAIL_BANNERS)[keyof typeof MAIL_BANNERS];
