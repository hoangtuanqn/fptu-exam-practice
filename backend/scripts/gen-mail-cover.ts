/**
 * Dựng ảnh bìa dùng chung cho MỌI email (assets/mail/cover.png, 1120x280 = tỉ lệ 4:1, hiển thị 560x140px trong thư).
 * Thiết kế tinh gọn, sáng, hợp với thẻ trắng viền vàng của email:
 * - Nền kem vàng nhạt, một vầng sáng tròn phía sau mascot.
 * - Trái: chữ logo "FEPass" (cùng phong cách logo), khẩu hiệu, dòng ghi công MST Software.
 * - Phải: mascot Cóc Pass chính thức (cùng hình với giao diện web).
 * Chạy lại khi muốn dựng ảnh:  npx tsx scripts/gen-mail-cover.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { COLOR, MASCOT_H, MASCOT_W, loadFonts, mascotArt, measure, textD, wordmark, type Fonts } from "./brand-art";

const OUT_DIR = path.resolve(__dirname, "../assets/mail");
export const COVER_W = 1120;
export const COVER_H = 280;

/** Dựng toàn bộ SVG ảnh bìa email */
export function buildCover(f: Fonts): string {
  const mx = 64; // lề trái
  const ruleW = 590; // bề rộng vùng chữ bên trái

  // Chữ logo + khẩu hiệu
  const wmSize = 112;
  const wmBase = 128;
  const tl1 = "Hành trình đi đến ";
  const tl2 = "điểm 10.";
  const tlSize = 31;
  const tl1W = measure(f.semibold, tl1, tlSize);
  const tl2W = measure(f.semibold, tl2, tlSize);
  const taglineD = textD(f.semibold, tl1, tlSize, mx, 190);
  const tagline2D = textD(f.bold, tl2, tlSize, mx + tl1W, 190);

  // Hàng chân: địa chỉ web bên trái, ghi công bên phải
  const footY = 244;
  const urlD = textD(f.bold, "FEPASS.TOP", 18, mx, footY, { spacing: 0.14 });
  const credit = "Dự án được phát triển bởi: ";
  const brand = "MST Software";
  const cs = 16.5;
  const creditW = measure(f.medium, credit, cs) + measure(f.bold, brand, cs);
  const cx0 = mx + ruleW - creditW;
  const creditD = textD(f.medium, credit, cs, cx0, footY);
  const brandD = textD(f.bold, brand, cs, cx0 + measure(f.medium, credit, cs), footY);

  // Mascot trên mảng tối bên phải
  const ms = 2.45;
  const mW = MASCOT_W * ms;
  const mH = MASCOT_H * ms;
  const mX = 790;
  const mY = (COVER_H - mH) / 2 - 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${COVER_W}" height="${COVER_H}" viewBox="0 0 ${COVER_W} ${COVER_H}">
  <defs>
    <linearGradient id="dark" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4a2e08"/>
      <stop offset="1" stop-color="${COLOR.gold900}"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${COLOR.gold400}" stop-opacity="0.55"/>
      <stop offset="1" stop-color="${COLOR.gold400}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="gGreen" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#22C55E" stop-opacity="0.45"/>
      <stop offset="1" stop-color="#22C55E" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="gOrange" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#FF7A45" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#FF7A45" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="lbg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFFDF0"/>
      <stop offset="1" stop-color="${COLOR.gold100}"/>
    </linearGradient>
  </defs>

  <rect width="${COVER_W}" height="${COVER_H}" fill="url(#lbg)"/>
  <!-- Hình tròn màu nhẹ ở nền trái -->
  <circle cx="20" cy="262" r="110" fill="${COLOR.gold200}" opacity="0.55"/>
  <circle cx="640" cy="20" r="62" fill="#FFB89A" opacity="0.45"/>
  <circle cx="676" cy="70" r="14" fill="#22C55E" opacity="0.8"/>

  <!-- Mảng tối bên phải, cạnh vát -->
  <path d="M742 0 H${COVER_W} V${COVER_H} H690 Z" fill="url(#dark)"/>
  <path d="M742 0 L690 ${COVER_H}" stroke="${COLOR.gold500}" stroke-width="5"/>
  <circle cx="${mX + mW / 2}" cy="${COVER_H / 2}" r="150" fill="url(#glow)"/>

  <circle cx="1090" cy="250" r="130" fill="url(#gGreen)"/>
  <circle cx="1060" cy="10" r="120" fill="url(#gOrange)"/>
  <!-- Hoa giấy -->
  <circle cx="780" cy="52" r="6" fill="#22C55E"/>
  <circle cx="1098" cy="118" r="5" fill="#FF5A5F"/>
  <circle cx="1040" cy="40" r="4" fill="#FFFFFF" opacity="0.9"/>
  <circle cx="770" cy="214" r="5" fill="#FF8A5B"/>
  <rect x="1078" y="206" width="16" height="5" rx="2.5" fill="#FFD033" transform="rotate(-35 1086 208)"/>
  <rect x="738" y="120" width="14" height="5" rx="2.5" fill="#FFFFFF" opacity="0.85" transform="rotate(30 745 122)"/>
  <path d="M1012 26 l8 0 M1016 22 l0 8" stroke="#22C55E" stroke-width="3" stroke-linecap="round"/>
  <path d="M752 250 l8 0 M756 246 l0 8" stroke="#FFD033" stroke-width="3" stroke-linecap="round"/>
  <path d="M1052 86 q6 -7 12 0 t12 0" fill="none" stroke="#FF5A5F" stroke-width="3" stroke-linecap="round"/>

  <g transform="translate(${mX} ${mY}) scale(${ms})">${mascotArt(f)}</g>

  ${wordmark(f.logo, "FEPass", wmSize, mx - 2, wmBase)}
  <rect x="${mx + tl1W - 1}" y="168" width="${tl2W + 8}" height="26" rx="6" fill="${COLOR.gold300}" opacity="0.85"/>
  <path d="${taglineD}" fill="${COLOR.gold800}"/>
  <path d="${tagline2D}" fill="${COLOR.gold900}"/>

  <rect x="${mx}" y="210" width="${ruleW - 20}" height="1.5" fill="${COLOR.gold200}"/>
  <path d="${urlD}" fill="${COLOR.gold700}"/>
  <path d="${creditD}" fill="${COLOR.gold700}"/>
  <path d="${brandD}" fill="${COLOR.gold900}"/>
</svg>`;
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const svg = buildCover(await loadFonts());
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, "cover.png"));
  await fs.writeFile(path.join(OUT_DIR, "cover.svg"), svg, "utf-8");
  console.log("Đã cập nhật assets/mail/cover.png và cover.svg (1120x280)");
}

if (require.main === module) void main();
