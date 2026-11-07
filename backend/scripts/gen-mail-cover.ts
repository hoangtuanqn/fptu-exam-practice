/**
 * Dựng ảnh bìa dùng chung cho MỌI email (assets/mail/cover.png) và logo nhỏ (assets/mail/logo.png).
 * Chạy lại khi muốn đổi hình:  npx tsx scripts/gen-mail-cover.ts
 * Ảnh vẽ bằng SVG (màu lấy từ BRAND.md, mascot Cóc Pass của giao diện) rồi sharp xuất PNG. Kích thước 1120x440 = gấp đôi ô 560px trong thư (nét trên màn hình retina).
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MASCOT_SVG } from "../../frontend/src/shared/ui/mascot-art";

const OUT_DIR = path.resolve(__dirname, "../assets/mail");
const W = 1120;
const H = 440;
const FONT = "Inter, 'Segoe UI', Arial, Helvetica, sans-serif";

// Mascot: bỏ thẻ <svg> ngoài, đặt vào hệ toạ độ riêng (132x100)
const mascotInner = MASCOT_SVG.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "");

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

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
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
  <g transform="translate(700 70) scale(2.3)">${mascotInner}</g>

  <!-- huy hiệu 10/10 -->
  <g transform="translate(1000 205)">
    <circle r="52" fill="#ffffff"/>
    <circle r="52" fill="none" stroke="#00c8ff" stroke-width="5"/>
    <text x="0" y="12" text-anchor="middle" font-family="${FONT}" font-size="38" font-weight="800" fill="#0066ff">10</text>
    <text x="0" y="34" text-anchor="middle" font-family="${FONT}" font-size="13" font-weight="700" fill="#667085" letter-spacing="1.5">ĐIỂM</text>
  </g>

  <!-- chữ thương hiệu -->
  <text x="92" y="238" font-family="${FONT}" font-size="104" font-weight="800" fill="url(#word)" letter-spacing="-2">FEPass</text>
  <rect x="96" y="266" width="120" height="6" rx="3" fill="#00c8ff"/>
  <text x="96" y="320" font-family="${FONT}" font-size="30" font-weight="600" fill="#b3d6ff">Hành trình đi đến điểm 10.</text>
  <text x="96" y="362" font-family="${FONT}" font-size="22" font-weight="500" fill="#80b8ff" opacity=".9">Luyện thi FE FPTU · fepass.top</text>

  <rect y="${H - 12}" width="${W}" height="12" fill="url(#bar)"/>
</svg>`;

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9, palette: false }).toFile(path.join(OUT_DIR, "cover.png"));
  // Logo nhỏ ở khối chữ ký (rộng 240px = 120px trong thư)
  await sharp(path.resolve(__dirname, "../../frontend/public/brand/logo-full.png")).resize({ width: 240 }).png({ compressionLevel: 9 }).toFile(path.join(OUT_DIR, "logo.png"));
  await fs.writeFile(path.join(OUT_DIR, "cover.svg"), svg); // bản vector để chỉnh lại khi cần
  console.log("Đã tạo cover.png, logo.png");
}

void main();
