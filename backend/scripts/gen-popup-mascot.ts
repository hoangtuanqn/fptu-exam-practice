/**
 * Dựng ba lớp ảnh Cóc Pass đội nón Noel đang leo bám viền popup trang chủ (nền trong suốt, cùng khung 160x150 gồm 10 đơn vị chừa cho nón, mép popup nằm ở y = EDGE + 10 tính từ đỉnh ảnh):
 *   mascot-climb-body.webp  đầu + thân (thân cắt phẳng ở mép, như đang treo người sau popup)
 *   mascot-climb-hand-l.webp / -hand-r.webp  cánh tay + bàn tay bám mép, ngón rủ xuống mặt trước của popup (tách lớp để CSS cho hai tay thay nhau với tới)
 * Chạy lại:  npx tsx scripts/gen-popup-mascot.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { santaHat } from "../../frontend/src/shared/ui/santa-hat";

export const W = 160;
export const H = 140;
export const EDGE = 130;
const DIR = path.resolve(__dirname, "../../frontend/public/promo");
const B = "#9a5f00";
const sw = (n: number) => `stroke="${B}" stroke-width="${n}" stroke-linejoin="round" stroke-linecap="round"`;
const DEFS = `<defs>
  <radialGradient id="gold" cx=".42" cy=".28" r=".85"><stop offset="0" stop-color="#fff08a"/><stop offset=".5" stop-color="#ffc61f"/><stop offset="1" stop-color="#e29400"/></radialGradient>
  <linearGradient id="belly" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff9d0"/><stop offset="1" stop-color="#ffe58c"/></linearGradient>
</defs>`;

const eye = (x: number, y: number, r: number) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gold)" ${sw(2)}/>` +
  `<circle cx="${x}" cy="${y + 1}" r="${r * 0.68}" fill="#fff" ${sw(1)}/>` +
  `<circle cx="${x + 1.5}" cy="${y + 2}" r="${r * 0.42}" fill="#1a1208"/><circle cx="${x + 3}" cy="${y - 0.8}" r="${r * 0.16}" fill="#fff"/>`;

const body = `
  <path d="M40 ${EDGE}C36 100 52 84 80 84C108 84 124 100 120 ${EDGE}Z" fill="url(#gold)" ${sw(2.2)}/>
  <ellipse cx="80" cy="118" rx="22" ry="22" fill="url(#belly)" opacity=".9"/>
  <ellipse cx="80" cy="58" rx="50" ry="34" fill="url(#gold)" ${sw(2.2)}/>
  ${eye(50, 34, 15)}${eye(110, 34, 15)}
  <circle cx="76" cy="54" r="1.4" fill="${B}"/><circle cx="84" cy="54" r="1.4" fill="${B}"/>
  <path d="M50 67Q80 88 110 67" fill="none" stroke="#7a3f00" stroke-width="2.8" stroke-linecap="round"/>
  <ellipse cx="46" cy="66" rx="6.5" ry="4" fill="#ff8f6b" opacity=".6"/><ellipse cx="114" cy="66" rx="6.5" ry="4" fill="#ff8f6b" opacity=".6"/>
  ${santaHat(80, 27, 0.95, 4)}`;

const digit = (x: number, y: number, h: number) => `<rect x="${x}" y="${y}" width="10" height="${h}" rx="5" fill="url(#gold)" ${sw(1.8)}/>`;
// Cánh tay từ vai xuống, bàn tay nằm trên mép, ba ngón mập rủ xuống mặt trước của popup
const hand = (x: number, side: 1 | -1) => {
  const arm = `M${80 + side * 34} 96C${x + side * 8} 104 ${x + side * 2} 114 ${x} ${EDGE - 7}`;
  return (
    `<path d="${arm}" fill="none" ${sw(16)}/><path d="${arm}" fill="none" stroke="#ffc61f" stroke-width="11.5" stroke-linecap="round"/>` +
    `${digit(x - 17, EDGE - 4, 17)}${digit(x - 5, EDGE - 4, 20)}${digit(x + 7, EDGE - 4, 17)}` +
    `<ellipse cx="${x}" cy="${EDGE - 6}" rx="19" ry="11" fill="url(#gold)" ${sw(2)}/>`
  );
};

const layers: Record<string, string> = {
  "mascot-climb-body.webp": body,
  "mascot-climb-hand-l.webp": hand(46, -1),
  "mascot-climb-hand-r.webp": hand(114, 1),
};

void (async () => {
  await fs.mkdir(DIR, { recursive: true });
  for (const [name, inner] of Object.entries(layers)) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 3}" height="${(H + 10) * 3}" viewBox="0 -10 ${W} ${H + 10}">${DEFS}${inner}</svg>`;
    await sharp(Buffer.from(svg)).webp({ quality: 92, alphaQuality: 100 }).toFile(path.join(DIR, name));
  }
  console.log("Đã dựng", Object.keys(layers).join(", "));
})();
