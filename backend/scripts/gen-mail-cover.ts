/**
 * Dựng ảnh bìa dùng chung cho MỌI email (assets/mail/cover.png, 1120x440 = gấp đôi ô 560px trong thư).
 * Chạy lại khi muốn đổi hình:  npx tsx scripts/gen-mail-cover.ts   (logo, favicon, ảnh chia sẻ: gen-brand-assets.ts)
 * Tông vàng của mascot Cóc Pass trên nền nâu đậm. Hàm coverContent() cũng được ảnh chia sẻ (og-cover) dùng lại.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { COLOR, mascotArt, text, type Fonts, loadFonts } from "./brand-art";

const OUT_DIR = path.resolve(__dirname, "../assets/mail");
export const COVER_W = 1120;
export const COVER_H = 440;

// Một tờ đề: nền trắng, vài dòng chữ giả, ô tròn đánh dấu đúng/sai
const sheet = (x: number, y: number, rot: number, scale: number, ok: boolean, opacity = 1) => `
  <g transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})" opacity="${opacity}">
    <rect x="-70" y="-90" width="140" height="180" rx="14" fill="#000" opacity=".25" transform="translate(6 10)"/>
    <rect x="-70" y="-90" width="140" height="180" rx="14" fill="#ffffff"/>
    <rect x="-70" y="-90" width="140" height="30" rx="14" fill="${COLOR.gold100}"/>
    <rect x="-70" y="-72" width="140" height="12" fill="${COLOR.gold100}"/>
    <rect x="-54" y="-80" width="52" height="8" rx="4" fill="${COLOR.gold600}"/>
    ${[0, 1, 2].map((i) => `
      <circle cx="-48" cy="${-36 + i * 40}" r="9" fill="${ok || i !== 1 ? "#12b76a" : "#f04438"}"/>
      <path d="${ok || i !== 1 ? `M-52.5 ${-36 + i * 40}l3.4 3.6 6.6-7.4` : `M-52 ${-40 + i * 40}l8 8m0-8l-8 8`}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="-30" y="${-42 + i * 40}" width="84" height="7" rx="3.5" fill="${COLOR.gold200}"/>
      <rect x="-30" y="${-30 + i * 40}" width="58" height="7" rx="3.5" fill="#f6efd6"/>`).join("")}
  </g>`;

// Ô vuông "pixel" vàng ở góc trái trên
const pixels = [
  [70, 56, 22, 0.95], [98, 56, 22, 0.6], [70, 84, 22, 0.55], [126, 56, 22, 0.32], [98, 84, 22, 0.28], [70, 112, 22, 0.3],
]
  .map(([x, y, s, o]) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="4" fill="${COLOR.gold500}" opacity="${o}"/>`)
  .join("");

/** Nội dung ảnh bìa trong hệ toạ độ 1120x440 (không gồm nền): dùng lại cho ảnh chia sẻ */
export const coverContent = (f: Fonts) => `
  ${pixels}
  <circle cx="850" cy="215" r="260" fill="url(#glow)"/>
  <g fill="none" stroke="#ffffff">
    <circle cx="850" cy="215" r="120" stroke-opacity=".45" stroke-width="2"/>
    <circle cx="850" cy="215" r="180" stroke-opacity=".28" stroke-width="2"/>
    <circle cx="850" cy="215" r="245" stroke-opacity=".18" stroke-width="2"/>
    <circle cx="850" cy="215" r="320" stroke-opacity=".1" stroke-width="2"/>
  </g>
  ${sheet(1010, 120, 12, 0.62, true, 0.95)}
  ${sheet(690, 290, -14, 0.5, false, 0.85)}
  ${sheet(985, 330, 8, 0.4, true, 0.7)}
  <ellipse cx="850" cy="372" rx="130" ry="14" fill="#000" opacity=".3"/>
  <g transform="translate(700 70) scale(2.3)">${mascotArt(f)}</g>
  <g transform="translate(1000 205)">
    <circle r="52" fill="#ffffff"/>
    <circle r="52" fill="none" stroke="${COLOR.gold500}" stroke-width="5"/>
    ${text(f.extrabold, "10", 38, 0, 12, COLOR.gold700, { anchor: "middle" })}
    ${text(f.bold, "ĐIỂM", 13, 0, 34, COLOR.gold800, { anchor: "middle", spacing: 0.115 })}
  </g>
  ${text(f.extrabold, "FEPass", 104, 92, 238, "url(#word)", { spacing: -0.02 })}
  <rect x="96" y="266" width="120" height="6" rx="3" fill="${COLOR.gold500}"/>
  ${text(f.semibold, "Hành trình đi đến điểm 10.", 30, 96, 320, COLOR.gold200)}
  ${text(f.medium, "Luyện thi FE FPTU · fepass.top", 22, 96, 362, COLOR.gold400, { opacity: 0.9 })}`;

/** Phần <defs> (gradient) dùng chung */
export const coverDefs = `
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#241502"/><stop offset=".5" stop-color="#5c3706"/><stop offset="1" stop-color="#b87400"/>
    </linearGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="${COLOR.gold500}" stop-opacity=".5"/><stop offset="1" stop-color="${COLOR.gold500}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${COLOR.gold600}"/><stop offset=".5" stop-color="${COLOR.gold500}"/><stop offset="1" stop-color="${COLOR.gold100}"/>
    </linearGradient>
    <linearGradient id="word" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${COLOR.gold100}"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity=".05" stroke-width="1"/>
    </pattern>`;

export const buildCover = (f: Fonts) => `<svg xmlns="http://www.w3.org/2000/svg" width="${COVER_W}" height="${COVER_H}" viewBox="0 0 ${COVER_W} ${COVER_H}">
  <defs>${coverDefs}</defs>
  <rect width="${COVER_W}" height="${COVER_H}" fill="url(#bg)"/>
  <rect width="${COVER_W}" height="${COVER_H}" fill="url(#grid)"/>
  ${coverContent(f)}
  <rect y="${COVER_H - 12}" width="${COVER_W}" height="12" fill="url(#bar)"/>
</svg>`;

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const svg = buildCover(await loadFonts());
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, "cover.png"));
  await fs.writeFile(path.join(OUT_DIR, "cover.svg"), svg); // bản vector để chỉnh lại khi cần
  console.log("Đã tạo assets/mail/cover.png");
}

if (require.main === module) void main();
