/**
 * Dựng ảnh Cóc Pass đội nón Noel đu bám vào góc trên bên phải của popup: frontend/public/promo/mascot-corner.webp (nền trong suốt).
 * Điểm góc của popup nằm ở CORNER (toạ độ ảnh 280x230): tay trên bám mép trên (y = CORNER.y), tay dưới bám mép phải (x = CORNER.x).
 * Popup đặt ảnh theo hai số này nên đổi CORNER thì phải đổi cả nơi đặt ảnh.
 * Chạy lại:  npx tsx scripts/gen-popup-mascot.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MASCOT_SVG } from "../../frontend/src/shared/ui/mascot-art";
import { santaHat } from "../../frontend/src/shared/ui/santa-hat";

export const W = 280;
export const H = 230;
export const CORNER = { x: 120, y: 110 };
const OUT = path.resolve(__dirname, "../../frontend/public/promo/mascot-corner.webp");
const BROWN = "#9a5f00";

// Thân + đầu của mascot (bỏ bảng danh hiệu và hai tay đỡ bảng)
const head = MASCOT_SVG.slice(MASCOT_SVG.indexOf("<defs>"), MASCOT_SVG.indexOf('<g><rect x="64" y="68"'));

const arm = (d: string) => `<path d="${d}" fill="none" stroke="${BROWN}" stroke-width="16" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#ffc61f" stroke-width="11" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#fff08a" stroke-width="3" stroke-linecap="round" opacity=".7" transform="translate(-2 -2)"/>`;
const finger = (x1: number, y1: number, x2: number, y2: number) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${BROWN}" stroke-width="9.5" stroke-linecap="round"/><path d="M${x1} ${y1}L${x2} ${y2}" stroke="#ffc61f" stroke-width="6" stroke-linecap="round"/>`;
const sparkle = (x: number, y: number, r: number) => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="#fff6c8"/>`;

const { x: cx, y: cy } = CORNER;
// Cóc đứng bên cạnh phải của popup, quay mặt sang trái (lật ngang), nghiêng nhẹ; một tay vắt qua góc bám mép trên, một tay bám mép phải
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2}" height="${H * 2}" viewBox="0 0 ${W} ${H}">
  <defs></defs>
  <ellipse cx="${cx + 12}" cy="${cy + 96}" rx="26" ry="5" fill="#000" opacity=".18"/>
  ${sparkle(250, 40, 9)}${sparkle(262, 66, 5)}${sparkle(176, 22, 6)}
  <g transform="translate(196 108) rotate(8) scale(-1.2 1.2) translate(-66 -50)">${head}${santaHat(53, 19, 0.62, 12)}</g>
  ${arm(`M158 112C146 118 132 112 ${cx - 28} ${cy - 10}`)}
  ${arm(`M168 140C152 150 ${cx + 22} ${cy + 66} ${cx + 8} ${cy + 76}`)}
  <!-- tay trên ôm mép trên: ngón rủ xuống mặt trước -->
  <g>${finger(cx - 52, cy - 4, cx - 52, cy + 13)}${finger(cx - 42, cy - 4, cx - 42, cy + 16)}${finger(cx - 32, cy - 4, cx - 32, cy + 14)}
  <ellipse cx="${cx - 34}" cy="${cy - 9}" rx="20" ry="11" fill="url(#gold)" stroke="${BROWN}" stroke-width="2.2"/></g>
  <!-- tay dưới bám mép phải: ngón vòng sang mặt trước -->
  <g>${finger(cx + 2, cy + 64, cx - 15, cy + 64)}${finger(cx + 2, cy + 75, cx - 17, cy + 75)}${finger(cx + 2, cy + 86, cx - 15, cy + 86)}
  <ellipse cx="${cx + 8}" cy="${cy + 76}" rx="11" ry="19" fill="url(#gold)" stroke="${BROWN}" stroke-width="2.2"/></g>
</svg>`;

void (async () => {
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await sharp(Buffer.from(svg)).webp({ quality: 90, alphaQuality: 100 }).toFile(OUT);
  console.log("Đã dựng", OUT);
})();
