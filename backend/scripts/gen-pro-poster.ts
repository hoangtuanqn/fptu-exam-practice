/**
 * Dựng poster quảng cáo gói PRO (Giáng sinh) cho popup trang chủ: frontend/public/promo/pro-poster.webp (960x600).
 * Chỉ chứa nội dung cố định (không ghi số ngày/giá vì các số đó đổi theo DB, popup tự hiện bằng chữ).
 * Chạy lại khi muốn dựng ảnh:  npx tsx scripts/gen-pro-poster.ts --theme=xmas
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { COLOR, MASCOT_H, MASCOT_W, loadFonts, mascotArt, textD, wordmark, xmasOverlay } from "./brand-art";

const W = 960;
const H = 600;
const OUT = path.resolve(__dirname, "../../frontend/public/promo/pro-poster.webp");

async function main() {
  const f = await loadFonts();
  const perks = ["Toàn bộ đề thi", "Toàn bộ flashcard", "Mọi tính năng, không giới hạn"];
  const ms = 3.4;
  const mx = W - MASCOT_W * ms - 14;
  const my = H - MASCOT_H * ms - 40;
  const pill = "ƯU ĐÃI KỲ MỚI";
  const rows = perks
    .map((p, i) => {
      const y = 418 + i * 52;
      return `<circle cx="72" cy="${y - 9}" r="15" fill="${COLOR.gold500}"/><path d="M64 ${y - 9} l6 6 l11 -12" fill="none" stroke="#5a0b10" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${textD(f.bold, p, 25, 100, y)}" fill="#fff"/>`;
    })
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a3141c"/><stop offset="1" stop-color="#4d0a10"/></linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${COLOR.gold400}" stop-opacity=".55"/><stop offset="1" stop-color="${COLOR.gold400}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <circle cx="${mx + (MASCOT_W * ms) / 2}" cy="${my + (MASCOT_H * ms) / 2}" r="330" fill="url(#glow)"/>
  <path d="M600 0 H${W} V${H} H520 Z" fill="#000" opacity=".12"/>
  <rect x="48" y="44" width="${22 + pill.length * 15}" height="40" rx="20" fill="${COLOR.gold500}"/>
  <path d="${textD(f.extrabold, pill, 21, 48 + 15, 72, { spacing: 0.08 })}" fill="#4d0a10"/>
  ${wordmark(f.logo, "PRO", 190, 44, 270)}
  <path d="${textD(f.extrabold, "Mở khóa tất cả", 40, 48, 338)}" fill="${COLOR.gold200}"/>
  ${rows}
  <path d="${textD(f.bold, "FEPASS.TOP", 22, 48, 568, { spacing: 0.14 })}" fill="${COLOR.gold300}"/>
  <g transform="translate(${mx} ${my}) scale(${ms})">${mascotArt(f)}</g>
  ${xmasOverlay(W, H)}
</svg>`;
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await sharp(Buffer.from(svg)).webp({ quality: 88 }).toFile(OUT);
  console.log("Đã dựng", OUT);
}

void main();
