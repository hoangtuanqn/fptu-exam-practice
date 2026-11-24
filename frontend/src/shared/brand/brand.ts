import type { SyntheticEvent } from "react";
import { loadBrand } from "../../../brand.config";
import { useSeason } from "@/shared/season/SeasonContext";

// Thông tin thương hiệu dùng trong giao diện. Đổi ở frontend/brand.config.ts hoặc frontend/.env
export const brand = loadBrand(import.meta.env);

// Tài sản logo nằm ở public/brand/ (thay file cùng tên để đổi logo toàn site)
export const logos = {
  mark: "/brand/logo-mark.webp", // mascot Cóc Pass, dùng ở header
  fullOnLight: "/brand/logo-full.webp", // mascot + chữ FEPass (nâu/vàng), cho nền sáng
  fullOnDark: "/brand/logo-full-light.webp", // mascot + chữ FEPass (trắng/vàng), cho nền tối
} as const;

// Bản Giáng sinh của logo (public/brand/xmas/, sinh bằng script ảnh thương hiệu). Bản gốc ở trên giữ nguyên.
const xmasLogos = {
  mark: "/brand/xmas/logo-mark.webp",
  fullOnLight: "/brand/xmas/logo-full.webp",
  fullOnDark: "/brand/xmas/logo-full-light.webp",
} as const;

export type LogoKey = keyof typeof logos;

/** Logo theo mùa: đang mùa Giáng sinh thì trả ảnh trong brand/xmas/ */
export const useLogos = (): Record<LogoKey, string> => (useSeason().xmas ? xmasLogos : logos);

/** onError cho <img> logo: thiếu file bản mùa thì quay về file gốc, không bao giờ hiện ảnh vỡ */
export const logoFallback =
  (key: LogoKey) =>
  (e: SyntheticEvent<HTMLImageElement>): void => {
    const img = e.currentTarget;
    if (img.getAttribute("src") !== logos[key]) img.src = logos[key];
  };
