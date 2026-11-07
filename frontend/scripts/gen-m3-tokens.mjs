/**
 * Sinh TOÀN BỘ token Material Design 3 vào src/styles/m3-tokens.css: màu (từ MỘT màu seed, cho cả sáng và tối) + bậc chữ + hình dạng +
 * độ nổi theo tông + trạng thái + chuyển động + khoảng cách.
 *   cd frontend && npx tsx scripts/gen-m3-tokens.mjs
 * Dùng thuật toán HCT chính thức của Google (@material/material-color-utilities, SchemeTonalSpot):
 *  - các vai trò primary / secondary / tertiary / error / surface / outline (+ container, on-*, inverse, scrim...) lấy từ các bảng tông (tonal palette)
 *  - 5 mức surface container (lowest → highest) dùng cho độ nổi (elevation) thay cho đổ bóng
 *  - vai trò mở rộng "success" và "warning" (đúng/sai, cảnh báo) được hài hoà (harmonize) về màu chính
 * Cuối cùng in báo cáo tỉ lệ tương phản WCAG 2.1 của mọi cặp (on-X trên X) và thoát lỗi nếu có cặp dưới AA.
 * Đổi màu thương hiệu = đổi SEED rồi chạy lại.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Hct, SchemeTonalSpot, MaterialDynamicColors as M, argbFromHex, hexFromArgb, Blend } from "@material/material-color-utilities";

const SEED = "#ffc61f"; // vàng của mascot Cóc Pass
const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/styles/m3-tokens.css");

// Màu nghiệp vụ mở rộng (không có sẵn trong M3): hài hoà về màu chính để không "lạc tông"
const EXTENDED = { success: "#1f9d55", warning: "#e08e00" };

const ROLES = {
  primary: M.primary, onPrimary: M.onPrimary, primaryContainer: M.primaryContainer, onPrimaryContainer: M.onPrimaryContainer,
  secondary: M.secondary, onSecondary: M.onSecondary, secondaryContainer: M.secondaryContainer, onSecondaryContainer: M.onSecondaryContainer,
  tertiary: M.tertiary, onTertiary: M.onTertiary, tertiaryContainer: M.tertiaryContainer, onTertiaryContainer: M.onTertiaryContainer,
  error: M.error, onError: M.onError, errorContainer: M.errorContainer, onErrorContainer: M.onErrorContainer,
  background: M.background, onBackground: M.onBackground,
  surface: M.surface, onSurface: M.onSurface, surfaceVariant: M.surfaceVariant, onSurfaceVariant: M.onSurfaceVariant,
  surfaceDim: M.surfaceDim, surfaceBright: M.surfaceBright,
  surfaceContainerLowest: M.surfaceContainerLowest, surfaceContainerLow: M.surfaceContainerLow, surfaceContainer: M.surfaceContainer,
  surfaceContainerHigh: M.surfaceContainerHigh, surfaceContainerHighest: M.surfaceContainerHighest,
  outline: M.outline, outlineVariant: M.outlineVariant,
  inverseSurface: M.inverseSurface, inverseOnSurface: M.inverseOnSurface, inversePrimary: M.inversePrimary,
  shadow: M.shadow, scrim: M.scrim, surfaceTint: M.surfaceTint,
};

const kebab = (s) => s.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase());
const seed = Hct.fromInt(argbFromHex(SEED));

function build(isDark) {
  const scheme = new SchemeTonalSpot(seed, isDark, 0);
  const out = {};
  for (const [name, dyn] of Object.entries(ROLES)) out[name] = hexFromArgb(dyn.getArgb(scheme));
  // vai trò mở rộng: tông 40/90 (sáng) hoặc 80/30 (tối) của bảng màu hài hoà, giống cách M3 tạo primary/primaryContainer
  for (const [name, hex] of Object.entries(EXTENDED)) {
    const h = Hct.fromInt(Blend.harmonize(argbFromHex(hex), argbFromHex(SEED)));
    const tone = (t) => hexFromArgb(Hct.from(h.hue, Math.max(h.chroma, 36), t).toInt());
    out[name] = tone(isDark ? 80 : 40);
    out[`on${name[0].toUpperCase()}${name.slice(1)}`] = tone(isDark ? 20 : 100);
    out[`${name}Container`] = tone(isDark ? 30 : 90);
    out[`on${name[0].toUpperCase()}${name.slice(1)}Container`] = tone(isDark ? 90 : 10);
  }
  return out;
}

const light = build(false);
const dark = build(true);

// ---- Tương phản WCAG 2.1
const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
const PAIRS = [
  ["onPrimary", "primary"], ["onPrimaryContainer", "primaryContainer"],
  ["onSecondary", "secondary"], ["onSecondaryContainer", "secondaryContainer"],
  ["onTertiary", "tertiary"], ["onTertiaryContainer", "tertiaryContainer"],
  ["onError", "error"], ["onErrorContainer", "errorContainer"],
  ["onSuccess", "success"], ["onSuccessContainer", "successContainer"],
  ["onWarning", "warning"], ["onWarningContainer", "warningContainer"],
  ["onSurface", "surface"], ["onSurface", "surfaceContainerLowest"], ["onSurface", "surfaceContainerLow"], ["onSurface", "surfaceContainer"],
  ["onSurface", "surfaceContainerHigh"], ["onSurface", "surfaceContainerHighest"],
  ["onSurfaceVariant", "surface"], ["onSurfaceVariant", "surfaceContainerHighest"], ["onSurfaceVariant", "surfaceVariant"],
  ["onBackground", "background"], ["inverseOnSurface", "inverseSurface"],
  ["primary", "surface"], ["error", "surface"], ["inversePrimary", "inverseSurface"],
];
let failed = 0;
const report = [];
for (const [label, scheme] of [["sáng", light], ["tối", dark]]) {
  for (const [fg, bg] of PAIRS) {
    const r = ratio(scheme[fg], scheme[bg]);
    const ok = r >= 4.5;
    if (!ok) failed++;
    report.push(`${ok ? "OK  " : "THẤP"} ${label.padEnd(4)} ${fg.padEnd(24)} trên ${bg.padEnd(24)} ${r.toFixed(2)}:1`);
  }
  // outline là viền điều khiển: cần >= 3:1 với surface (WCAG 1.4.11 thành phần giao diện)
  const r = ratio(scheme.outline, scheme.surface);
  if (r < 3) failed++;
  report.push(`${r >= 3 ? "OK  " : "THẤP"} ${label.padEnd(4)} ${"outline".padEnd(24)} trên ${"surface".padEnd(24)} ${r.toFixed(2)}:1 (viền, cần 3:1)`);
}

// ---- Ghi CSS
const block = (scheme) =>
  Object.entries(scheme)
    .map(([name, hex]) => `  --md-sys-color-${kebab(name)}: ${hex};`)
    .join("\n");

// ---- Token không phải màu (giá trị theo đặc tả M3; phông là Inter của thương hiệu)
const TYPE = {
  "display-large": [57, 64, 400, -0.25], "display-medium": [45, 52, 400, 0], "display-small": [36, 44, 400, 0],
  "headline-large": [32, 40, 400, 0], "headline-medium": [28, 36, 400, 0], "headline-small": [24, 32, 400, 0],
  "title-large": [22, 28, 400, 0], "title-medium": [16, 24, 500, 0.15], "title-small": [14, 20, 500, 0.1],
  "body-large": [16, 24, 400, 0.5], "body-medium": [14, 20, 400, 0.25], "body-small": [12, 16, 400, 0.4],
  "label-large": [14, 20, 500, 0.1], "label-medium": [12, 16, 500, 0.5], "label-small": [11, 16, 500, 0.5],
};
const typeVars = Object.entries(TYPE)
  .map(([n, [size, line, weight, track]]) => `  --md-sys-typescale-${n}-size: ${size / 16}rem;
  --md-sys-typescale-${n}-line-height: ${line / 16}rem;
  --md-sys-typescale-${n}-weight: ${weight};
  --md-sys-typescale-${n}-tracking: ${track / 16}rem;`)
  .join("\n");
const typeClasses = Object.keys(TYPE)
  .map((n) => `.md-${n} { font-family: var(--md-sys-typescale-font); font-size: var(--md-sys-typescale-${n}-size); line-height: var(--md-sys-typescale-${n}-line-height); font-weight: var(--md-sys-typescale-${n}-weight); letter-spacing: var(--md-sys-typescale-${n}-tracking); }`)
  .join("\n");

const SHAPE = { none: 0, "extra-small": 4, small: 8, medium: 12, large: 16, "extra-large": 28, full: 9999 };
const shapeVars = Object.entries(SHAPE).map(([n, v]) => `  --md-sys-shape-corner-${n}: ${v}px;`).join("\n");

// Độ nổi: lớp phủ TÔNG (surface container) thay cho đổ bóng nặng; chỉ có bóng rất nhẹ ở mức 3 trở lên cho vật thể nổi (menu, hộp thoại, FAB)
const elevationVars = `  --md-sys-elevation-level0: var(--md-sys-color-surface);
  --md-sys-elevation-level1: var(--md-sys-color-surface-container-low);
  --md-sys-elevation-level2: var(--md-sys-color-surface-container);
  --md-sys-elevation-level3: var(--md-sys-color-surface-container-high);
  --md-sys-elevation-level4: var(--md-sys-color-surface-container-high);
  --md-sys-elevation-level5: var(--md-sys-color-surface-container-highest);
  --md-sys-elevation-shadow-1: 0 1px 2px rgb(0 0 0 / 0.1);
  --md-sys-elevation-shadow-2: 0 1px 3px 1px rgb(0 0 0 / 0.07), 0 1px 2px rgb(0 0 0 / 0.1);
  --md-sys-elevation-shadow-3: 0 2px 6px 2px rgb(0 0 0 / 0.09), 0 1px 2px rgb(0 0 0 / 0.1);
  --md-sys-elevation-shadow-4: 0 4px 8px 3px rgb(0 0 0 / 0.09), 0 1px 3px rgb(0 0 0 / 0.1);
  --md-sys-elevation-shadow-5: 0 6px 10px 4px rgb(0 0 0 / 0.09), 0 2px 3px rgb(0 0 0 / 0.1);`;

const stateVars = `  --md-sys-state-hover-opacity: 0.08;
  --md-sys-state-focus-opacity: 0.1;
  --md-sys-state-pressed-opacity: 0.1;
  --md-sys-state-dragged-opacity: 0.16;
  --md-sys-state-disabled-content-opacity: 0.38;
  --md-sys-state-disabled-container-opacity: 0.12;`;

const motionVars = `  --md-sys-motion-easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --md-sys-motion-easing-standard-decelerate: cubic-bezier(0, 0, 0, 1);
  --md-sys-motion-easing-standard-accelerate: cubic-bezier(0.3, 0, 1, 1);
  --md-sys-motion-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);
  --md-sys-motion-easing-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1);
  --md-sys-motion-easing-emphasized-accelerate: cubic-bezier(0.3, 0, 0.8, 0.15);
  --md-sys-motion-duration-short1: 50ms;
  --md-sys-motion-duration-short2: 100ms;
  --md-sys-motion-duration-short3: 150ms;
  --md-sys-motion-duration-short4: 200ms;
  --md-sys-motion-duration-medium1: 250ms;
  --md-sys-motion-duration-medium2: 300ms;
  --md-sys-motion-duration-medium3: 350ms;
  --md-sys-motion-duration-medium4: 400ms;
  --md-sys-motion-duration-long1: 450ms;
  --md-sys-motion-duration-long2: 500ms;`;

const spacingVars = [0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 14, 16]
  .map((n) => `  --md-sys-spacing-${n}: ${n * 4}px;`)
  .join("\n"); // lưới 4dp; bội 8dp là 2, 4, 6, 8, 10, 12, 16

const css = `/* TỰ SINH bởi scripts/gen-m3-tokens.mjs từ màu seed ${SEED} (SchemeTonalSpot). Đừng sửa tay: sửa script rồi chạy lại.
   Sáng/tối dùng CÙNG bộ vai trò. Chọn chủ đề: <html data-theme="light|dark">; không đặt thì theo prefers-color-scheme. */

/* ---- Token không đổi theo chủ đề: bậc chữ, hình dạng, độ nổi, trạng thái, chuyển động, khoảng cách ---- */
:root {
  --md-sys-typescale-font: "Inter", system-ui, sans-serif; /* phông thương hiệu (M3 mặc định là Roboto) */
${typeVars}
${shapeVars}
${stateVars}
${motionVars}
${spacingVars}
}

/* ---- Màu: sáng ---- */
:root,
:root[data-theme="light"] {
  color-scheme: light;
${block(light)}
${elevationVars}
}

/* ---- Màu: tối ---- */
:root[data-theme="dark"] {
  color-scheme: dark;
${block(dark)}
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme]) {
    color-scheme: dark;
${block(dark).replace(/^/gm, "  ")}
  }
}

/* ---- Lớp tiện ích bậc chữ: .md-display-large ... .md-label-small ---- */
${typeClasses}
`;
// ---- Ánh xạ token vào Tailwind v4: bg-primary, text-on-surface, rounded-m3-lg, shadow-m3-2, ease-m3-standard ...
const OUT_TW = path.resolve(path.dirname(OUT), "m3-tailwind.css");
const colorMap = Object.keys(light)
  .map((n) => `  --color-${kebab(n)}: var(--md-sys-color-${kebab(n)});`)
  .join("\n");
const radiusMap = ["none", "extra-small", "small", "medium", "large", "extra-large", "full"]
  .map((n) => `  --radius-m3-${{ none: "none", "extra-small": "xs", small: "sm", medium: "md", large: "lg", "extra-large": "xl", full: "full" }[n]}: var(--md-sys-shape-corner-${n});`)
  .join("\n");
const shadowMap = [1, 2, 3, 4, 5].map((n) => `  --shadow-m3-${n}: var(--md-sys-elevation-shadow-${n});`).join("\n");
const easeMap = ["standard", "standard-decelerate", "standard-accelerate", "emphasized", "emphasized-decelerate", "emphasized-accelerate"]
  .map((n) => `  --ease-m3-${n}: var(--md-sys-motion-easing-${n});`)
  .join("\n");
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT_TW,
  `/* TỰ SINH bởi scripts/gen-m3-tokens.mjs. Ánh xạ token M3 thành tiện ích Tailwind (inline: đọc biến CSS lúc chạy nên đổi chủ đề sáng/tối là đổi ngay). */
@theme inline {
${colorMap}
${radiusMap}
${shadowMap}
${easeMap}
}
`,
);

fs.writeFileSync(OUT, css);
console.log(report.join("\n"));
console.log(`\nĐã ghi ${path.relative(process.cwd(), OUT)} (${Object.keys(light).length} vai trò x 2 chủ đề). ${failed ? `CÓ ${failed} cặp dưới ngưỡng AA!` : "Mọi cặp đạt AA."}`);
process.exit(failed ? 1 : 0);
