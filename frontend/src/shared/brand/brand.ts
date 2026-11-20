import { loadBrand } from "../../../brand.config";

// Thông tin thương hiệu dùng trong giao diện. Đổi ở frontend/brand.config.ts hoặc frontend/.env
export const brand = loadBrand(import.meta.env);

// Tài sản logo nằm ở public/brand/ (thay file cùng tên để đổi logo toàn site)
export const logos = {
  mark: "/brand/logo-mark.webp", // mascot Cóc Pass, dùng ở header
  fullOnLight: "/brand/logo-full.webp", // mascot + chữ FEPass (nâu/vàng), cho nền sáng
  fullOnDark: "/brand/logo-full-light.webp", // mascot + chữ FEPass (trắng/vàng), cho nền tối
} as const;
