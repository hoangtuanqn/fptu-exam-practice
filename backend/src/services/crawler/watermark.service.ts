import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";

type Size = { width: number; height: number };
type RawImage = Size & { data: Buffer };
type PngImage = Size & { png: Buffer };

// ---------- Logo của mình ----------
const LOGO_FILE = path.resolve(
  __dirname,
  "../../../assets/brand/watermark.png",
);
const LOGO_WIDTH_RATIO = 0.075; // logo rộng bằng ngần này chiều rộng ảnh
const LOGO_MIN_WIDTH = 40;
const LOGO_MARGIN_RATIO = 0.02;
const LOGO_OPACITY = 0.3; // mờ nhẹ để không che nội dung đề

// ---------- Dấu nguồn cần xóa (góc dưới trái) ----------
const SOURCE_MARK_W_RATIO = 0.11;
const SOURCE_MARK_H_RATIO = 0.1;

// Logo đã cắt viền trong suốt và giảm độ đậm, nạp một lần rồi dùng lại
let logo: Promise<RawImage> | null = null;
const loadLogo = () =>
  (logo ??= (async () => {
    const { data, info } = await sharp(LOGO_FILE)
      .trim()
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += 4)
      data[i] = Math.round(data[i]! * LOGO_OPACITY);
    return { data, width: info.width, height: info.height };
  })());

// Ảnh đề thường cùng khổ nên logo đã co theo từng chiều rộng được cache lại
const resized = new Map<number, Promise<PngImage>>();
const logoAt = (mark: RawImage, width: number): Promise<PngImage> => {
  let hit = resized.get(width);
  if (!hit) {
    hit = sharp(mark.data, {
      raw: { width: mark.width, height: mark.height, channels: 4 },
    })
      .resize({ width })
      .png()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => ({
        png: data,
        width: info.width,
        height: info.height,
      }));
    if (resized.size > 64) resized.clear();
    resized.set(width, hit);
  }
  return hit;
};

// ---------- Các lớp phủ ----------
type Layer = (size: Size) => Promise<OverlayOptions> | OverlayOptions;

/** Logo mờ ở góc dưới bên phải */
const brandLayer: Layer = async ({ width, height }) => {
  const mark = await loadLogo();
  const target = Math.min(
    Math.max(LOGO_MIN_WIDTH, Math.round(width * LOGO_WIDTH_RATIO)),
    Math.floor(width / 2), // không để dấu to hơn ảnh nhỏ
  );
  const overlay = await logoAt(mark, target);
  const margin = Math.round(width * LOGO_MARGIN_RATIO);
  return {
    input: overlay.png,
    left: Math.max(0, width - overlay.width - margin),
    top: Math.max(0, height - overlay.height - margin),
  };
};

/** Khối trắng phủ dấu nguồn ở góc dưới bên trái */
const sourceMaskLayer: Layer = ({ width, height }) => {
  const w = Math.min(width, Math.ceil(width * SOURCE_MARK_W_RATIO));
  const h = Math.min(height, Math.ceil(height * SOURCE_MARK_H_RATIO));
  return {
    input: {
      create: { width: w, height: h, channels: 3, background: "#ffffff" },
    },
    left: 0,
    top: height - h,
  };
};

// ---------- Pipeline chung: decode 1 lần, phủ các lớp, encode WebP 1 lần ----------
async function render(
  input: Buffer,
  quality: number,
  layers: Layer[],
): Promise<Buffer> {
  const base = sharp(input, { animated: false });
  const { width, height } = await base.metadata();
  if (!width || !height) return base.webp({ quality }).toBuffer();

  const size = { width, height };
  const overlays = await Promise.all(layers.map((l) => l(size)));
  return base.composite(overlays).webp({ quality }).toBuffer();
}

/** Đóng dấu logo mờ vào góc dưới bên phải. Trả về WebP. */
export const stampWatermark = (input: Buffer, quality: number) =>
  render(input, quality, [brandLayer]);

/** Phủ trắng dấu nguồn ở góc dưới bên trái. Trả về WebP. */
export const removeWatermark = (input: Buffer, quality: number) =>
  render(input, quality, [sourceMaskLayer]);

/** Xóa dấu nguồn và đóng logo trong cùng một lần encode. Trả về WebP. */
export const processExamImage = (input: Buffer, quality: number) =>
  render(input, quality, [sourceMaskLayer, brandLayer]);
