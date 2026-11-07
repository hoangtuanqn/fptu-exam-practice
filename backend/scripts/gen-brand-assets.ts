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
import { COLOR, MASCOT_H, MASCOT_W, loadFonts, mascotArt, mascotSvg, measure, wordmark, type Fonts } from "./brand-art";
import { COVER_H, COVER_W, buildCover, coverContent, coverDefs } from "./gen-mail-cover";

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

// Ảnh chia sẻ link 1200x630: dùng lại bố cục ảnh bìa email, nới nền cho đủ khung
function ogCover(f: Fonts) {
  const W = 1200;
  const H = 630;
  const k = W / COVER_W;
  const dy = (H - COVER_H * k) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>${coverDefs}</defs>
    <rect width="${W}" height="${H}" fill="url(#bg)"/>
    <rect width="${W}" height="${H}" fill="url(#grid)"/>
    <g transform="translate(0 ${dy}) scale(${k})">${coverContent(f)}</g>
    <rect y="${H - 12}" width="${W}" height="12" fill="url(#bar)"/>
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
