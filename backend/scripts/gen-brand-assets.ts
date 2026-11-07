/**
 * Dựng toàn bộ ảnh thương hiệu từ mascot Cóc Pass:
 *  - frontend/public/brand/logo-mark.png, logo-full.png (nền sáng), logo-full-light.png (nền tối)
 *  - favicon.ico, favicon-32.png, icon-192.png, icon-512.png, apple-touch-icon.png, og-cover.jpg (ảnh chia sẻ link)
 *  - chrome-extension/icons/icon{16,32,48,128}.png
 *  - backend/assets/mail/logo.png (logo ở chữ ký email) + cover.png (ảnh bìa email)
 * Chạy:  npx tsx scripts/gen-brand-assets.ts      (phông Inter: assets/fonts/Inter-*.ttf; logo MST cũ giữ ở public/brand/mst-logo-*.png)
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { COLOR, MASCOT_H, MASCOT_W, loadFonts, mascotArt, mascotSvg, measure, text, wordmark, type Fonts } from "./brand-art";
import { buildCover } from "./gen-mail-cover";

const ROOT = path.resolve(__dirname, "../..");
const PUBLIC = path.join(ROOT, "frontend/public");
const BRAND = path.join(PUBLIC, "brand");
const EXT_ICONS = path.join(ROOT, "chrome-extension/icons");
const MAIL = path.join(ROOT, "backend/assets/mail");

const png = (svg: string) => sharp(Buffer.from(svg)).png({ compressionLevel: 9 });

// Logo chính: chữ "FEPass" kiểu logo (phông Lilita One, gradient vàng, viền nâu, khối nổi) với con Cóc Pass NGỒI TRÊN dòng chữ
// (đứng lên các chữ thường "ss"), kèm vài ánh lấp lánh. `dark` chỉ khác ở viền (sáng hơn một chút trên nền tối).
function logoFull(f: Fonts, dark: boolean, scale: number) {
  const font = f.logo;
  const size = 64;
  const sp = 0.01;
  const os2 = (font.tables as unknown as { os2?: { sxHeight?: number; sCapHeight?: number } }).os2 ?? {};
  const xHeight = size * ((os2.sxHeight || font.unitsPerEm * 0.5) / font.unitsPerEm);
  const capHeight = size * ((os2.sCapHeight || font.unitsPerEm * 0.7) / font.unitsPerEm);
  const edge = size * 0.058;
  const depth = size * 0.055;
  const pad = Math.ceil(edge + 2);
  const toadScale = 0.7;
  const toadW = MASCOT_W * toadScale;
  const toadH = MASCOT_H * toadScale;
  const wAll = measure(font, "FEPass", size, sp);
  const baseline = toadH + xHeight - edge * 0.6; // đáy con cóc = đỉnh chữ thường (đè nhẹ lên viền)
  const toadX = Math.min(wAll - toadW + 10, wAll * 0.78 - toadW / 2);
  const width = Math.ceil(Math.max(wAll, toadX + toadW) + pad * 2 + 8);
  const height = Math.ceil(baseline + depth + pad + 2);
  const star = (cx: number, cy: number, r: number) => `<path transform="translate(${cx} ${cy})" d="M0 ${-r}Q0 0 ${r} 0Q0 0 0 ${r}Q0 0 ${-r} 0Q0 0 0 ${-r}Z" fill="#fffbe0" stroke="${COLOR.gold600}" stroke-width="0.9" stroke-linejoin="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}">
    <g transform="translate(${pad} 0)">
      ${wordmark(font, "FEPass", size, 0, baseline, { dark, spacing: sp })}
      <g transform="translate(${toadX} 0) scale(${toadScale})">${mascotArt(f)}</g>
      ${star(toadX + toadW + 2, toadH * 0.3, 6.5)}
      ${star(toadX - 5, toadH * 0.62, 4)}
      ${star(size * 0.62, baseline - capHeight - 7, 4.5)}
    </g>
  </svg>`;
}

// Biểu tượng vuông (favicon, icon ứng dụng): mascot trên nền nâu đậm bo góc để nổi bật ở cỡ nhỏ
function squareIcon(f: Fonts, size: number, rounded = true) {
  const s = 0.64; // mascot chiếm khoảng 64% chiều rộng
  const tx = (100 - MASCOT_W * s) / 2;
  const ty = (100 - MASCOT_H * s) / 2 + 3;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
    <defs><radialGradient id="g" cx=".5" cy=".45" r=".6"><stop offset="0" stop-color="#7a4b00"/><stop offset="1" stop-color="${COLOR.gold900}"/></radialGradient></defs>
    <rect width="100" height="100" rx="${rounded ? 22 : 0}" fill="url(#g)"/>
    <g transform="translate(${tx} ${ty}) scale(${s})">${mascotArt(f)}</g>
  </svg>`;
}

// Ảnh chia sẻ link 1200x630 (Facebook, Zalo, OpenGraph): cùng ngôn ngữ thiết kế với ảnh bìa email (trái sáng, phải tối cạnh vát)
function ogCover(f: Fonts) {
  const W = 1200;
  const H = 630;
  const mx = 80;
  const ruleW = 640;

  const tl1 = "Hành trình đi đến ";
  const tl2 = "điểm 10.";
  const tlSize = 46;
  const tl1W = measure(f.semibold, tl1, tlSize);
  const tl2W = measure(f.semibold, tl2, tlSize);

  const footY = 520;
  const credit = "Dự án được phát triển bởi: ";
  const brand = "MST Software";
  const cs = 20;
  const creditW = measure(f.medium, credit, cs) + measure(f.bold, brand, cs);
  const cx0 = mx + ruleW - creditW;

  const ms = 2.8;
  const mW = MASCOT_W * ms;
  const mH = MASCOT_H * ms;
  const mX = 800;
  const mY = (H - mH) / 2 - 6;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="lbg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFFDF0"/><stop offset="1" stop-color="${COLOR.gold100}"/></linearGradient>
      <linearGradient id="dark" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4a2e08"/><stop offset="1" stop-color="${COLOR.gold900}"/></linearGradient>
      <radialGradient id="glow" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${COLOR.gold400}" stop-opacity="0.55"/><stop offset="1" stop-color="${COLOR.gold400}" stop-opacity="0"/></radialGradient>
      <radialGradient id="gGreen" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#22C55E" stop-opacity="0.45"/><stop offset="1" stop-color="#22C55E" stop-opacity="0"/></radialGradient>
      <radialGradient id="gOrange" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FF7A45" stop-opacity="0.5"/><stop offset="1" stop-color="#FF7A45" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#lbg)"/>
    <circle cx="30" cy="600" r="220" fill="${COLOR.gold200}" opacity="0.55"/>
    <circle cx="690" cy="40" r="110" fill="#FFB89A" opacity="0.45"/>
    <circle cx="745" cy="150" r="22" fill="#22C55E" opacity="0.8"/>

    <path d="M820 0 H${W} V${H} H742 Z" fill="url(#dark)"/>
    <path d="M820 0 L742 ${H}" stroke="${COLOR.gold500}" stroke-width="8"/>
    <circle cx="${mX + mW / 2}" cy="${H / 2}" r="270" fill="url(#glow)"/>
    <circle cx="1150" cy="590" r="260" fill="url(#gGreen)"/>
    <circle cx="1110" cy="20" r="250" fill="url(#gOrange)"/>
    <circle cx="876" cy="96" r="10" fill="#22C55E"/>
    <circle cx="1150" cy="270" r="8" fill="#FF5A5F"/>
    <circle cx="1090" cy="86" r="6" fill="#FFFFFF" opacity="0.9"/>
    <circle cx="850" cy="470" r="8" fill="#FF8A5B"/>
    <rect x="1112" y="470" width="26" height="8" rx="4" fill="#FFD033" transform="rotate(-35 1125 474)"/>
    <rect x="800" y="250" width="22" height="8" rx="4" fill="#FFFFFF" opacity="0.85" transform="rotate(30 811 254)"/>
    <path d="M1030 48 l13 0 M1036.500 41.500 l0 13" stroke="#22C55E" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M790 574 l13 0 M796.500 567.500 l0 13" stroke="#FFD033" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M1090 190 q9 -11 18 0 t18 0" fill="none" stroke="#FF5A5F" stroke-width="4.5" stroke-linecap="round"/>

    <g transform="translate(${mX} ${mY}) scale(${ms})">${mascotArt(f)}</g>

    ${wordmark(f.logo, "FEPass", 156, mx - 4, 238, { spacing: 0.01 })}
    <rect x="${mx + tl1W - 2}" y="${290}" width="${tl2W + 14}" height="${tlSize * 0.88}" rx="9" fill="${COLOR.gold300}" opacity="0.85"/>
    ${text(f.semibold, tl1, tlSize, mx, 326, COLOR.gold800)}
    ${text(f.bold, tl2, tlSize, mx + tl1W, 326, COLOR.gold900)}
    ${text(f.medium, "Kho đề trắc nghiệm FE · Lời giải chi tiết", 26, mx, 384, COLOR.gold700)}

    <rect x="${mx}" y="450" width="${ruleW}" height="2" fill="${COLOR.gold200}"/>
    ${text(f.bold, "FEPASS.TOP", 22, mx, footY, COLOR.gold700, { spacing: 0.14 })}
    ${text(f.medium, credit, cs, cx0, footY, COLOR.gold700)}
    ${text(f.bold, brand, cs, cx0 + measure(f.medium, credit, cs), footY, COLOR.gold900)}
  </svg>`;
}

// File .ico chứa nhiều ảnh PNG (16, 32, 48)
function ico(images: { size: number; data: Buffer }[]) {
  const head = Buffer.alloc(6);
  head.writeUInt16LE(1, 2);
  head.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e[0] = size;
    e[1] = size;
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([head, ...entries, ...images.map((i) => i.data)]);
}

async function main() {
  const f = await loadFonts();
  await Promise.all([BRAND, EXT_ICONS, MAIL].map((d) => fs.mkdir(d, { recursive: true })));

  // Logo
  await png(mascotSvg(f, 400)).toFile(path.join(BRAND, "logo-mark.png"));
  await png(logoFull(f, false, 4)).toFile(path.join(BRAND, "logo-full.png"));
  await png(logoFull(f, true, 4)).toFile(path.join(BRAND, "logo-full-light.png"));

  // Favicon + icon ứng dụng
  const sizes = [16, 32, 48, 128, 180, 192, 512];
  const icons = new Map<number, Buffer>();
  for (const s of sizes) icons.set(s, await png(squareIcon(f, s * 2, s !== 180)).resize(s, s).toBuffer());
  await fs.writeFile(path.join(PUBLIC, "favicon-32.png"), icons.get(32)!);
  await fs.writeFile(path.join(PUBLIC, "icon-192.png"), icons.get(192)!);
  await fs.writeFile(path.join(PUBLIC, "icon-512.png"), icons.get(512)!);
  await fs.writeFile(path.join(PUBLIC, "apple-touch-icon.png"), icons.get(180)!);
  await fs.writeFile(path.join(PUBLIC, "favicon.ico"), ico([16, 32, 48].map((size) => ({ size, data: icons.get(size)! }))));
  for (const s of [16, 32, 48, 128]) await fs.writeFile(path.join(EXT_ICONS, `icon${s}.png`), icons.get(s)!);

  // Ảnh chia sẻ link
  await sharp(Buffer.from(ogCover(f))).jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(PUBLIC, "og-cover.jpg"));

  // Email: logo ở chữ ký (rộng 240px, bản cho nền sáng) + ảnh bìa
  await png(logoFull(f, false, 4)).resize({ width: 240 }).toFile(path.join(MAIL, "logo.png"));
  await sharp(Buffer.from(buildCover(f))).png({ compressionLevel: 9 }).toFile(path.join(MAIL, "cover.png"));

  console.log("Đã tạo logo, favicon, icon, og-cover, icon tiện ích và ảnh email");
}

void main();
