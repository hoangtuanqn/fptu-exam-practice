/**
 * Dựng ảnh Cóc Pass đội nón Noel đu bám vào góc trên bên phải của popup: frontend/public/promo/mascot-corner.webp (nền trong suốt).
 * Điểm góc của popup nằm ở CORNER (toạ độ ảnh 290x230): tay trên bám mép trên (y = CORNER.y), tay dưới bám mép phải (x = CORNER.x).
 * Popup đặt ảnh theo hai số này nên đổi CORNER thì phải đổi cả nơi đặt ảnh.
 * Chạy lại:  npx tsx scripts/gen-popup-mascot.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MASCOT_SVG } from "../../frontend/src/shared/ui/mascot-art";
import { santaHat } from "../../frontend/src/shared/ui/santa-hat";

export const W = 290;
export const H = 230;
export const CORNER = { x: 120, y: 110 };
const OUT = path.resolve(__dirname, "../../frontend/public/promo/mascot-corner.webp");
const BROWN = "#9a5f00";

// Thân + đầu của mascot (bỏ bảng danh hiệu và hai tay đỡ bảng)
const head = MASCOT_SVG.slice(MASCOT_SVG.indexOf("<defs>"), MASCOT_SVG.indexOf('<g><rect x="64" y="68"'));

// Tay ngắn, mập, đầu tròn như tay cầm bảng của mascot gốc (hai nét viền: nâu rồi vàng)
const arm = (d: string) => `<path d="${d}" fill="none" stroke="${BROWN}" stroke-width="17" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#ffc61f" stroke-width="12.5" stroke-linecap="round"/>`;
const digit = (x: number, y: number, w: number, h: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" fill="url(#gold)" stroke="${BROWN}" stroke-width="1.8"/>`;
const sparkle = (x: number, y: number, r: number) => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="#fff6c8"/>`;

const { x: cx, y: cy } = CORNER;
// Cóc đứng bên cạnh phải của popup, quay mặt sang trái (lật ngang), nghiêng nhẹ; một tay vắt qua góc bám mép trên, một tay bám mép phải
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2}" height="${H * 2}" viewBox="0 0 ${W} ${H}">
  <defs></defs>
  <ellipse cx="${cx + 20}" cy="${cy + 82}" rx="22" ry="4.5" fill="#000" opacity=".16"/>
  ${sparkle(258, 36, 9)}${sparkle(270, 62, 5)}${sparkle(190, 20, 6)}
  <g transform="translate(202 104) rotate(6) scale(-1.2 1.2) translate(-66 -50)">${head}${santaHat(53, 19, 0.62, 12)}</g>
  ${arm(`M158 98C148 98 136 98 ${cx - 12} ${cy - 5}`)}
  ${arm(`M166 134C156 144 146 148 ${cx + 20} ${cy + 46}`)}
  <!-- bàn tay trên: ba ngón mập rủ xuống mặt trước của mép trên, lòng bàn tay nằm trên mép -->
  <g>${digit(cx - 42, cy - 3, 11, 19)}${digit(cx - 30, cy - 3, 11, 22)}${digit(cx - 18, cy - 3, 11, 19)}
  <ellipse cx="${cx - 23}" cy="${cy - 8}" rx="19" ry="11.5" fill="url(#gold)" stroke="${BROWN}" stroke-width="2"/></g>
  <!-- bàn tay dưới: ba ngón mập vòng sang mặt trước của mép phải -->
  <g>${digit(cx - 18, cy + 31, 21, 11)}${digit(cx - 21, cy + 43, 24, 11)}${digit(cx - 18, cy + 55, 21, 11)}
  <ellipse cx="${cx + 12}" cy="${cy + 48}" rx="11.5" ry="19" fill="url(#gold)" stroke="${BROWN}" stroke-width="2"/></g>
</svg>`;

void (async () => {
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await sharp(Buffer.from(svg)).webp({ quality: 90, alphaQuality: 100 }).toFile(OUT);
  console.log("Đã dựng", OUT);
})();
