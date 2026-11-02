import { loadBrand } from "../../brand.config";

// Thông tin thương hiệu dùng trong giao diện. Đổi ở frontend/brand.config.ts hoặc frontend/.env
export const brand = loadBrand(import.meta.env);

// Tài sản logo nằm ở public/brand/ (thay file cùng tên để đổi logo toàn site)
export const logos = {
  mark: "/brand/logo-mark.png", // chỉ chữ MST, dùng ở header
  fullOnLight: "/brand/logo-full.png", // có chữ SOFTWARE.VN màu đen, cho nền sáng
  fullOnDark: "/brand/logo-full-light.png", // chữ trắng, cho nền tối
  partner: "/brand/fuoverflow.webp", // logo đối tác kho đề
} as const;
