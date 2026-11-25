/**
 * Dựng ảnh Cóc Pass đứng thẳng, đội nón Noel, thắt cà vạt, tay cầm cuộn bằng (dáng giống tượng linh vật FPT): frontend/public/promo/mascot-corner.webp (nền trong suốt).
 * Đế chân nằm ở y = FEET_Y (toạ độ ảnh 160x210): popup đặt ảnh sao cho đế chân đứng đúng trên mép trên của hộp thoại.
 * Chạy lại:  npx tsx scripts/gen-popup-mascot.ts
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { santaHat } from "../../frontend/src/shared/ui/santa-hat";

export const W = 160;
export const H = 210;
export const FEET_Y = 200;
const OUT = path.resolve(__dirname, "../../frontend/public/promo/mascot-corner.webp");
const B = "#9a5f00";
const sw = (n: number) => `stroke="${B}" stroke-width="${n}" stroke-linejoin="round" stroke-linecap="round"`;

const eye = (x: number, y: number, r: number) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gold)" ${sw(2)}/>` +
  `<circle cx="${x + 1}" cy="${y + 1}" r="${r * 0.68}" fill="#fff" ${sw(1)}/>` +
  `<circle cx="${x + 3}" cy="${y + 2}" r="${r * 0.42}" fill="#1a1208"/><circle cx="${x + 4.6}" cy="${y - 0.6}" r="${r * 0.16}" fill="#fff"/>`;
const foot = (x: number) =>
  `<path d="M${x - 24} ${FEET_Y}C${x - 28} ${FEET_Y - 10} ${x - 14} ${FEET_Y - 14} ${x} ${FEET_Y - 13}C${x + 14} ${FEET_Y - 14} ${x + 28} ${FEET_Y - 10} ${x + 24} ${FEET_Y}Z" fill="url(#gold)" ${sw(2)}/>` +
  `<path d="M${x - 9} ${FEET_Y}V${FEET_Y - 6}M${x + 3} ${FEET_Y}V${FEET_Y - 6}M${x + 14} ${FEET_Y}V${FEET_Y - 5}" fill="none" ${sw(1.2)}/>`;
const sparkle = (x: number, y: number, r: number) => `<path d="M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z" fill="#fff6c8"/>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 3}" height="${H * 3}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="gold" cx=".42" cy=".28" r=".85"><stop offset="0" stop-color="#fff08a"/><stop offset=".5" stop-color="#ffc61f"/><stop offset="1" stop-color="#e29400"/></radialGradient>
    <linearGradient id="belly" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff9d0"/><stop offset="1" stop-color="#ffe58c"/></linearGradient>
  </defs>
  <ellipse cx="80" cy="${FEET_Y + 1}" rx="58" ry="5" fill="#000" opacity=".18"/>
  ${sparkle(18, 40, 8)}${sparkle(142, 28, 6)}${sparkle(150, 70, 4)}
  ${foot(50)}${foot(110)}
  <!-- thân + bụng -->
  <path d="M80 92C44 92 32 128 36 160C39 182 58 192 80 192C102 192 121 182 124 160C128 128 116 92 80 92Z" fill="url(#gold)" ${sw(2.2)}/>
  <ellipse cx="80" cy="152" rx="28" ry="36" fill="url(#belly)" opacity=".95"/>
  <!-- cổ áo trắng + cà vạt đỏ -->
  <path d="M80 98L62 94L70 112Z M80 98L98 94L90 112Z" fill="#fff" ${sw(1.4)}/>
  <path d="M76 104H84L87 112L84 150L80 158L76 150L73 112Z" fill="#d62828" stroke="#7f1212" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M75 103H85L84 110H76Z" fill="#b71c1c" stroke="#7f1212" stroke-width="1.2" stroke-linejoin="round"/>
  <!-- tay trái buông dọc thân -->
  <path d="M42 112C30 126 28 146 34 158" fill="none" ${sw(17)}/><path d="M42 112C30 126 28 146 34 158" fill="none" stroke="#ffc61f" stroke-width="12.5" stroke-linecap="round"/>
  <ellipse cx="35" cy="162" rx="9" ry="8" fill="url(#gold)" ${sw(1.8)}/>
  <!-- đầu -->
  <ellipse cx="80" cy="68" rx="54" ry="38" fill="url(#gold)" ${sw(2.2)}/>
  ${eye(48, 44, 16)}${eye(112, 44, 16)}
  <circle cx="75" cy="64" r="1.5" fill="${B}"/><circle cx="85" cy="64" r="1.5" fill="${B}"/>
  <path d="M46 78Q80 102 114 78" fill="none" stroke="#7a3f00" stroke-width="3" stroke-linecap="round"/>
  <ellipse cx="42" cy="78" rx="7" ry="4.5" fill="#ff8f6b" opacity=".6"/><ellipse cx="118" cy="78" rx="7" ry="4.5" fill="#ff8f6b" opacity=".6"/>
  ${santaHat(80, 36, 1, 4)}
  <!-- tay phải co lại cầm cuộn bằng buộc nơ đỏ -->
  <path d="M118 112C130 124 126 138 110 142" fill="none" ${sw(17)}/><path d="M118 112C130 124 126 138 110 142" fill="none" stroke="#ffc61f" stroke-width="12.5" stroke-linecap="round"/>
  <g transform="rotate(-28 108 140)"><rect x="80" y="132" width="56" height="15" rx="7.5" fill="#fff6dc" ${sw(1.8)}/><rect x="110" y="131" width="7" height="17" fill="#d62828" stroke="#7f1212" stroke-width="1.2"/></g>
  <ellipse cx="108" cy="141" rx="10" ry="8.5" fill="url(#gold)" ${sw(1.8)}/>
  <path d="M104 137V145M108 136V146M112 137V145" fill="none" ${sw(1)}/>
</svg>`;

void (async () => {
  await fs.mkdir(path.dirname(OUT), { recursive: true });
  await sharp(Buffer.from(svg)).webp({ quality: 92, alphaQuality: 100 }).toFile(OUT);
  console.log("Đã dựng", OUT);
})();
