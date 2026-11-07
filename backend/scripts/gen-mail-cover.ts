/**
 * Dựng ảnh bìa dùng chung cho MỌI email (assets/mail/cover.png) và logo nhỏ (assets/mail/logo.png).
 * Chạy lại khi muốn đổi hình:  npx tsx scripts/gen-mail-cover.ts (phông: assets/fonts/Inter-*.ttf)
 * Ảnh vẽ bằng SVG (màu lấy từ BRAND.md, mascot Cóc Pass của giao diện) rồi sharp xuất PNG. Kích thước 1120x440 = gấp đôi ô 560px trong thư (nét trên màn hình retina).
 */
import fs from "node:fs/promises";
import path from "node:path";
import opentype from "opentype.js";
import sharp from "sharp";
import { MASCOT_SVG } from "../../frontend/src/shared/ui/mascot-art";

const OUT_DIR = path.resolve(__dirname, "../assets/mail");
const W = 1120;
const H = 440;
const FONT_DIR = path.resolve(__dirname, "../assets/fonts");

// Chữ trong ảnh được đổi thành đường nét (path) từ chính file phông Inter, nên ảnh luôn là Inter dù máy chạy script có cài Inter hay không
type Font = opentype.Font;
async function loadFont(file: string): Promise<Font> {
  const buf = await fs.readFile(path.join(FONT_DIR, file));
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer);
}
// Xếp chữ từng ký tự một (không qua bộ xử lý GSUB của opentype.js vì nó chưa hỗ trợ một số bảng của Inter); chuỗi đã ở dạng NFC nên dấu tiếng Việt là ký tự dựng sẵn
function text(font: Font, str: string, size: number, x: number, y: number, fill: string, opts: { anchor?: "start" | "middle"; spacing?: number; opacity?: number } = {}) {
  const scale = size / font.unitsPerEm;
  const gap = (opts.spacing ?? 0) * size; // spacing tính bằng em
  const glyphs = Array.from(str.normalize("NFC")).map((ch) => font.charToGlyph(ch));
  const width = glyphs.reduce((w, g) => w + (g.advanceWidth ?? 0) * scale + gap, 0) - gap;
  let cx = opts.anchor === "middle" ? x - width / 2 : x;
  let d = "";
  for (const g of glyphs) {
    d += g.getPath(cx, y, size).toPathData(2);
    cx += (g.advanceWidth ?? 0) * scale + gap;
  }
  return `<path d="${d}" fill="${fill}"${opts.opacity !== undefined ? ` opacity="${opts.opacity}"` : ""}/>`;
}

// Mascot: bỏ thẻ <svg> ngoài, đặt vào hệ toạ độ riêng (132x100)
const mascotInner = MASCOT_SVG.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");
// Bảng "CÓC PASS" của mascot: đổi chữ thành path Inter để không dính phông dự phòng của máy
const mascotArt = (bold: Font) => mascotInner.replace(/<text[^>]*>CÓC PASS<\/text>/, text(bold, "CÓC PASS", 7.6, 94.5, 91.8, "#6b3d00", { anchor: "middle" }));

// Một tờ đề: nền trắng, vài dòng chữ giả, ô tròn đánh dấu đúng/sai
const sheet = (x: number, y: number, rot: number, scale: number, ok: boolean, opacity = 1) => `
  <g transform="translate(${x} ${y}) rotate(${rot}) scale(${scale})" opacity="${opacity}">
    <rect x="-70" y="-90" width="140" height="180" rx="14" fill="#000" opacity=".22" transform="translate(6 10)"/>
    <rect x="-70" y="-90" width="140" height="180" rx="14" fill="#ffffff"/>
    <rect x="-70" y="-90" width="140" height="30" rx="14" fill="#eef6ff"/>
    <rect x="-70" y="-72" width="140" height="12" fill="#eef6ff"/>
    <rect x="-54" y="-80" width="52" height="8" rx="4" fill="#0066ff"/>
    ${[0, 1, 2].map((i) => `
      <circle cx="-48" cy="${-36 + i * 40}" r="9" fill="${ok || i !== 1 ? "#12b76a" : "#f04438"}"/>
      <path d="${ok || i !== 1 ? `M-52.5 ${-36 + i * 40}l3.4 3.6 6.6-7.4` : `M-52 ${-40 + i * 40}l8 8m0-8l-8 8`}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="-30" y="${-42 + i * 40}" width="84" height="7" rx="3.5" fill="#d9ebff"/>
      <rect x="-30" y="${-30 + i * 40}" width="58" height="7" rx="3.5" fill="#eaf2fc"/>`).join("")}
  </g>`;

// Ô vuông pixel xanh nhạt như ở góc logo MST
const pixels = [
  [70, 56, 22, 0.9], [98, 56, 22, 0.55], [70, 84, 22, 0.5], [126, 56, 22, 0.3], [98, 84, 22, 0.25], [70, 112, 22, 0.28],
]
  .map(([x, y, s, o]) => `<rect x="${x}" y="${y}" width="${s}" height="${s}" rx="4" fill="#3399ff" opacity="${o}"/>`)
  .join("");

const buildSvg = (f: { medium: Font; semibold: Font; bold: Font; extrabold: Font }) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0b1730"/><stop offset=".5" stop-color="#0f3a8a"/><stop offset="1" stop-color="#0066ff"/>
    </linearGradient>
    <radialGradient id="glow" cx=".5" cy=".5" r=".5">
      <stop offset="0" stop-color="#00c8ff" stop-opacity=".55"/><stop offset="1" stop-color="#00c8ff" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="bar" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#0066ff"/><stop offset=".5" stop-color="#00c8ff"/><stop offset="1" stop-color="#90e5ff"/>
    </linearGradient>
    <linearGradient id="word" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#90e5ff"/>
    </linearGradient>
    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M40 0H0V40" fill="none" stroke="#ffffff" stroke-opacity=".05" stroke-width="1"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#grid)"/>

  <!-- vầng sáng + vòng tròn đồng tâm phía sau mascot -->
  <circle cx="850" cy="215" r="260" fill="url(#glow)"/>
  <g fill="none" stroke="#ffffff">
    <circle cx="850" cy="215" r="120" stroke-opacity=".5" stroke-width="2"/>
    <circle cx="850" cy="215" r="180" stroke-opacity=".32" stroke-width="2"/>
    <circle cx="850" cy="215" r="245" stroke-opacity=".2" stroke-width="2"/>
    <circle cx="850" cy="215" r="320" stroke-opacity=".12" stroke-width="2"/>
  </g>

  ${pixels}

  <!-- tờ đề bay quanh mascot -->
  ${sheet(1010, 120, 12, 0.62, true, 0.95)}
  ${sheet(690, 290, -14, 0.5, false, 0.85)}
  ${sheet(985, 330, 8, 0.4, true, 0.7)}

  <!-- mascot Cóc Pass -->
  <ellipse cx="850" cy="372" rx="130" ry="14" fill="#000" opacity=".28"/>
  <g transform="translate(700 70) scale(2.3)">${mascotArt(f.extrabold)}</g>

  <!-- huy hiệu 10/10 -->
  <g transform="translate(1000 205)">
    <circle r="52" fill="#ffffff"/>
    <circle r="52" fill="none" stroke="#00c8ff" stroke-width="5"/>
    ${text(f.extrabold, "10", 38, 0, 12, "#0066ff", { anchor: "middle" })}
    ${text(f.bold, "ĐIỂM", 13, 0, 34, "#667085", { anchor: "middle", spacing: 0.115 })}
  </g>

  <!-- chữ thương hiệu -->
  ${text(f.extrabold, "FEPass", 104, 92, 238, "url(#word)", { spacing: -0.02 })}
  <rect x="96" y="266" width="120" height="6" rx="3" fill="#00c8ff"/>
  ${text(f.semibold, "Hành trình đi đến điểm 10.", 30, 96, 320, "#b3d6ff")}
  ${text(f.medium, "Luyện thi FE FPTU · fepass.top", 22, 96, 362, "#80b8ff", { opacity: 0.9 })}

  <rect y="${H - 12}" width="${W}" height="12" fill="url(#bar)"/>
</svg>`;

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const [medium, semibold, bold, extrabold] = await Promise.all(["Inter-500Medium.ttf", "Inter-600SemiBold.ttf", "Inter-700Bold.ttf", "Inter-800ExtraBold.ttf"].map(loadFont));
  const svg = buildSvg({ medium: medium!, semibold: semibold!, bold: bold!, extrabold: extrabold! });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: false }).toFile(path.join(OUT_DIR, "cover.png"));
  // Logo nhỏ ở khối chữ ký (rộng 240px = 120px trong thư)
  await sharp(path.resolve(__dirname, "../../frontend/public/brand/logo-full.png")).resize({ width: 240 }).png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, "logo.png"));
  await fs.writeFile(path.join(OUT_DIR, "cover.svg"), svg); // bản vector để chỉnh lại khi cần
  console.log("Đã tạo cover.png, logo.png");
}

void main();
