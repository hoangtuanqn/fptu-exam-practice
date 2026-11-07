/**
 * Phần vẽ dùng chung cho các script dựng ảnh thương hiệu (gen-brand-assets.ts, gen-mail-cover.ts):
 * nạp phông Inter, xếp chữ thành đường nét (path) và lấy hình mascot Cóc Pass từ giao diện.
 * Chữ trong ảnh luôn là Inter dù máy chạy script có cài Inter hay không.
 */
import fs from "node:fs/promises";
import path from "node:path";
import opentype from "opentype.js";
import { MASCOT_SVG } from "../../frontend/src/shared/ui/mascot-art";

const FONT_DIR = path.resolve(__dirname, "../assets/fonts");

export type Font = opentype.Font;
export interface Fonts {
  medium: Font;
  semibold: Font;
  bold: Font;
  extrabold: Font;
  logo: Font; // Lilita One: CHỈ dùng cho chữ trong logo (ảnh); chữ giao diện vẫn là Inter
}

async function loadFont(file: string): Promise<Font> {
  const buf = await fs.readFile(path.join(FONT_DIR, file));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
}

export async function loadFonts(): Promise<Fonts> {
  const [medium, semibold, bold, extrabold, logo] = await Promise.all(["Inter-500Medium.ttf", "Inter-600SemiBold.ttf", "Inter-700Bold.ttf", "Inter-800ExtraBold.ttf", "LilitaOne-Regular.ttf"].map(loadFont));
  return { medium: medium!, semibold: semibold!, bold: bold!, extrabold: extrabold!, logo: logo! };
}

// Bảng màu thương hiệu (khớp frontend/src/index.css)
export const COLOR = {
  gold50: "#fffbe6",
  gold100: "#fff4bf",
  gold200: "#ffe88a",
  gold300: "#ffdb57",
  gold400: "#ffd033",
  gold500: "#ffc61f",
  gold600: "#e29400",
  gold700: "#a86400",
  gold800: "#7a4b00",
  gold900: "#3f2606",
};

/** Độ rộng của chuỗi chữ (đơn vị ảnh) khi xếp bằng text() */
export function measure(font: Font, str: string, size: number, spacing = 0) {
  const scale = size / font.unitsPerEm;
  const gap = spacing * size;
  const glyphs = Array.from(str.normalize("NFC")).map((ch) => font.charToGlyph(ch));
  return glyphs.reduce((w, g) => w + (g.advanceWidth ?? 0) * scale + gap, 0) - gap;
}

/**
 * Xếp chữ từng ký tự một thành <path> (không qua bộ xử lý GSUB của opentype.js vì nó chưa hỗ trợ một số bảng của Inter);
 * chuỗi ở dạng NFC nên dấu tiếng Việt là ký tự dựng sẵn.
 */
export function textD(font: Font, str: string, size: number, x: number, y: number, opts: { anchor?: "start" | "middle"; spacing?: number } = {}) {
  const scale = size / font.unitsPerEm;
  const gap = (opts.spacing ?? 0) * size; // spacing tính bằng em
  const glyphs = Array.from(str.normalize("NFC")).map((ch) => font.charToGlyph(ch));
  const width = measure(font, str, size, opts.spacing ?? 0);
  let cx = opts.anchor === "middle" ? x - width / 2 : x;
  let d = "";
  for (const g of glyphs) {
    d += g.getPath(cx, y, size).toPathData(2);
    cx += (g.advanceWidth ?? 0) * scale + gap;
  }
  return d;
}

export function text(font: Font, str: string, size: number, x: number, y: number, fill: string, opts: { anchor?: "start" | "middle"; spacing?: number; opacity?: number } = {}) {
  return `<path d="${textD(font, str, size, x, y, opts)}" fill="${fill}"${opts.opacity !== undefined ? ` opacity="${opts.opacity}"` : ""}/>`;
}

// Mascot: bỏ thẻ <svg> ngoài, hệ toạ độ riêng 132x100; bảng "CÓC PASS" đổi thành path Inter để không dính phông dự phòng của máy
export const MASCOT_W = 132;
export const MASCOT_H = 100;
const mascotInner = MASCOT_SVG.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
export const mascotArt = (f: Fonts) => mascotInner.replace(/<text[^>]*>CÓC PASS<\/text>/, text(f.extrabold, "CÓC PASS", 7.6, 94.5, 91.8, "#6b3d00", { anchor: "middle" }));

/** SVG độc lập chỉ có mascot (nền trong suốt) */
export const mascotSvg = (f: Fonts, height = 400) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round((height * MASCOT_W) / MASCOT_H)}" height="${height}" viewBox="0 0 ${MASCOT_W} ${MASCOT_H}">${mascotArt(f)}</svg>`;

/**
 * Chữ kiểu logo (cùng phong cách con Cóc Pass): gradient vàng, viền nâu đậm, khối nổi phía dưới và ánh sáng ở nửa trên.
 * `dark`: viền sáng hơn một chút để không chìm trên nền tối.
 */
export function wordmark(font: Font, str: string, size: number, x: number, baseline: number, opts: { dark?: boolean; spacing?: number } = {}) {
  const edge = size * 0.058;
  const depth = size * 0.055;
  const d = textD(font, str, size, x, baseline, { spacing: opts.spacing ?? 0 });
  const outline = opts.dark ? "#8a5a12" : "#5f3a0d";
  const id = `wm${Math.round(x)}_${Math.round(baseline)}_${Math.round(size)}`;
  return `<defs>
    <linearGradient id="${id}f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6b0"/><stop offset=".42" stop-color="#ffcf2e"/><stop offset="1" stop-color="#e08e00"/></linearGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff" stop-opacity=".7"/><stop offset=".5" stop-color="#ffffff" stop-opacity="0"/></linearGradient>
  </defs>
  <path d="${d}" fill="${COLOR.gold900}" stroke="${COLOR.gold900}" stroke-width="${edge * 2}" stroke-linejoin="round" transform="translate(0 ${depth})"/>
  <path d="${d}" fill="${outline}" stroke="${outline}" stroke-width="${edge * 2}" stroke-linejoin="round"/>
  <path d="${d}" fill="url(#${id}f)"/>
  <path d="${d}" fill="url(#${id}s)"/>`;
}
