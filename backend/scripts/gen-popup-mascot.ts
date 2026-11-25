/**
 * Dựng ảnh Cóc Pass đội nón Noel đu bám vào góc trên bên phải của popup: frontend/public/promo/mascot-corner.webp (nền trong suốt).
 * Điểm góc của popup nằm ở CORNER (toạ độ ảnh 260x230): tay trái bám mép trên (y = CORNER.y), tay phải bám mép phải (x = CORNER.x).
 * Popup đặt ảnh theo hai số này nên đổi CORNER thì phải đổi cả nơi đặt ảnh.
 * Chạy lại:  npx tsx scripts/gen-popup-mascot.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MASCOT_SVG } from "../../frontend/src/shared/ui/mascot-art";
import { santaHat } from "../../frontend/src/shared/ui/santa-hat";

export const W = 260;
export const H = 230;
export const CORNER = { x: 204, y: 126 };
const OUT = path.resolve(__dirname, "../../frontend/public/promo/mascot-corner.webp");
const BROWN = "#9a5f00";

// Thân + đầu của mascot (bỏ bảng danh hiệu và hai tay đỡ bảng)
const head = MASCOT_SVG.slice(MASCOT_SVG.indexOf("<defs>"), MASCOT_SVG.indexOf('<g><rect x="64" y="68"'));

const arm = (d: string) => `<path d="${d}" fill="none" stroke="${BROWN}" stroke-width="15" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#ffc61f" stroke-width="10" stroke-linecap="round"/>`;
const finger = (x1: number, y1: number, x2: number, y2: number) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${BROWN}" stroke-width="9" stroke-linecap="round"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="#ffc61f" stroke-width="5.5" stroke-linecap="round"/>`;

const { x: cx, y: cy } = CORNER;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2}" height="${H * 2}" viewBox="0 0 ${W} ${H}">
  <defs></defs>
  <g transform="translate(84 22) rotate(-6 66 50) scale(1.1)">${head}${santaHat(53, 19, 0.62, 12)}</g>
  ${arm(`M140 100C128 108 122 114 ${cx - 90} ${cy - 8}`)}
  ${arm(`M188 100C206 100 ${cx + 10} 118 ${cx + 8} ${cy + 52}`)}
  <!-- tay trái ôm mép trên: ngón rủ xuống mặt trước -->
  <g>${finger(cx - 100, cy - 2, cx - 100, cy + 14)}${finger(cx - 90, cy - 2, cx - 90, cy + 16)}${finger(cx - 80, cy - 2, cx - 80, cy + 14)}
  <ellipse cx="${cx - 90}" cy="${cy - 6}" rx="19" ry="11" fill="url(#gold)" stroke="${BROWN}" stroke-width="2.2"/></g>
  <!-- tay phải ôm mép phải: ngón vòng sang mặt trước -->
  <g>${finger(cx + 2, cy + 52, cx - 14, cy + 52)}${finger(cx + 2, cy + 62, cx - 16, cy + 62)}${finger(cx + 2, cy + 72, cx - 14, cy + 72)}
  <ellipse cx="${cx + 8}" cy="${cy + 62}" rx="11" ry="19" fill="url(#gold)" stroke="${BROWN}" stroke-width="2.2"/></g>
</svg>`;

void (async () => {
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await sharp(Buffer.from(svg)).webp({ quality: 90, alphaQuality: 100 }).toFile(OUT);
  console.log("Đã dựng", OUT);
})();
