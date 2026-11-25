/**
 * Dựng ảnh Cóc Pass đội nón Noel đu bám vào góc trên bên phải của popup: frontend/public/promo/mascot-corner.webp (nền trong suốt).
 * Điểm góc của popup nằm ở CORNER (toạ độ ảnh 300x240): tay trên bám mép trên (y = CORNER.y), tay dưới bám mép phải (x = CORNER.x).
 * Popup đặt ảnh theo hai số này nên đổi CORNER thì phải đổi cả nơi đặt ảnh.
 * Chạy lại:  npx tsx scripts/gen-popup-mascot.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MASCOT_SVG } from "../../frontend/src/shared/ui/mascot-art";
import { santaHat } from "../../frontend/src/shared/ui/santa-hat";

export const W = 300;
export const H = 240;
export const CORNER = { x: 150, y: 150 };
const OUT = path.resolve(__dirname, "../../frontend/public/promo/mascot-corner.webp");
const BROWN = "#9a5f00";

// Thân + đầu của mascot (bỏ bảng danh hiệu và hai tay đỡ bảng)
const head = MASCOT_SVG.slice(MASCOT_SVG.indexOf("<defs>"), MASCOT_SVG.indexOf('<g><rect x="64" y="68"'));

const digit = (x: number, y: number, w: number, h: number) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${Math.min(w, h) / 2}" fill="url(#gold)" stroke="${BROWN}" stroke-width="1.8"/>`;
const sparkle = (x: number, y: number, r: number) => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="#fff6c8"/>`;
const stub = (d: string) => `<path d="${d}" fill="none" stroke="${BROWN}" stroke-width="15" stroke-linecap="round"/><path d="${d}" fill="none" stroke="#ffc61f" stroke-width="10.5" stroke-linecap="round"/>`;

const { x: cx, y: cy } = CORNER;
// Cóc núp sau góc trên bên phải của popup, ló đầu ra và bám hai tay vào hai mép: thân chỉ vẽ phần nằm NGOÀI popup (clipPath), nên không cần vẽ tay dài
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2}" height="${H * 2}" viewBox="0 0 ${W} ${H}">
  <defs><clipPath id="outside"><path clip-rule="evenodd" d="M0 0H${W}V${H}H0Z M0 ${cy}H${cx}V${H}H0Z"/></clipPath></defs>
  ${sparkle(268, 40, 9)}${sparkle(284, 68, 5)}${sparkle(200, 22, 6)}
  <g clip-path="url(#outside)"><g transform="translate(${cx + 16} ${cy - 24}) rotate(7) scale(-1.35 1.35) translate(-66 -50)">${head}${santaHat(53, 19, 0.62, 12)}</g></g>
  ${stub(`M${cx - 30} ${cy - 18}V${cy - 6}`)}
  ${stub(`M${cx + 18} ${cy + 36}H${cx + 8}`)}
  <!-- bàn tay trên: ba ngón mập rủ xuống mặt trước của mép trên -->
  <g>${digit(cx - 49, cy - 2, 11, 19)}${digit(cx - 37, cy - 2, 11, 22)}${digit(cx - 25, cy - 2, 11, 19)}
  <ellipse cx="${cx - 30}" cy="${cy - 6}" rx="19" ry="11.5" fill="url(#gold)" stroke="${BROWN}" stroke-width="2"/></g>
  <!-- bàn tay dưới: ba ngón mập vòng sang mặt trước của mép phải -->
  <g>${digit(cx - 18, cy + 30, 21, 11)}${digit(cx - 21, cy + 42, 24, 11)}${digit(cx - 18, cy + 54, 21, 11)}
  <ellipse cx="${cx + 10}" cy="${cy + 46}" rx="11.5" ry="19" fill="url(#gold)" stroke="${BROWN}" stroke-width="2"/></g>
</svg>`;

void (async () => {
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await sharp(Buffer.from(svg)).webp({ quality: 90, alphaQuality: 100 }).toFile(OUT);
  console.log("Đã dựng", OUT);
})();
