import path from "node:path";

// Thông tin hiện trong email. Giữ khớp với frontend/brand.config.ts
export const MAIL_BRAND = {
  company: "MST Software",
  product: "Luyện thi FE FPTU",
  tagline: "MMO Solution",
  founder: "Phạm Hoàng Tuấn",
  facebookUrl: "https://facebook.com/mstsoftware.vn",
  siteUrl: "https://fepass.top",
  // Màu vàng của mascot Cóc Pass (BRAND.md): gold = nền nút và đường nhấn; deep = chữ/liên kết trên nền trắng; dark = chữ trên nền vàng
  gold: "#ffc61f",
  deep: "#a86400",
  dark: "#3f2606",
} as const;

// Ảnh banner nằm cạnh mã nguồn (backend/assets/mail), đúng cả khi chạy từ src/ lẫn dist/
export const MAIL_ASSETS_DIR = path.resolve(__dirname, "../../assets/mail");

// Ảnh nhúng thẳng vào thư bằng cid (hiện cả khi chạy local, không cần ảnh trên internet). Dùng chung cho MỌI loại thư.
// Dựng lại ảnh bìa bằng: npx tsx scripts/gen-brand-assets.ts
export const MAIL_IMAGES = {
  cover: { file: "cover.png", cid: "cover@fepass", alt: "FEPass - Hành trình đi đến điểm 10" },
  logo: { file: "logo.png", cid: "logo@fepass", alt: "FEPass" },
} as const;
