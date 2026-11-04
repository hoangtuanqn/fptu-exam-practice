import path from "node:path";
import sharp from "sharp";

const LOGO_FILE = path.resolve(__dirname, "../../../assets/brand/watermark.png");
const WIDTH_RATIO = 0.16; // logo rộng bằng ngần này chiều rộng ảnh
const MIN_WIDTH = 72;
const MARGIN_RATIO = 0.02;
const OPACITY = 0.3; // mờ nhẹ để không che nội dung đề

// Logo đã cắt viền trong suốt và giảm độ đậm, nạp một lần rồi dùng lại cho mọi ảnh
let logo: Promise<{ data: Buffer; width: number; height: number }> | null = null;
const loadLogo = () =>
  (logo ??= (async () => {
    const { data, info } = await sharp(LOGO_FILE)
      .trim() // bỏ phần trong suốt thừa quanh logo
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    for (let i = 3; i < data.length; i += 4) data[i] = Math.round(data[i]! * OPACITY); // nhân kênh alpha
    return { data, width: info.width, height: info.height };
  })());

// Ảnh đề thường cùng khổ nên logo đã co theo từng chiều rộng được giữ lại dùng chung
const resized = new Map<number, Promise<{ png: Buffer; width: number; height: number }>>();
const overlayFor = (mark: { data: Buffer; width: number; height: number }, width: number) => {
  let hit = resized.get(width);
  if (!hit) {
    hit = sharp(mark.data, { raw: { width: mark.width, height: mark.height, channels: 4 } })
      .resize({ width })
      .png()
      .toBuffer({ resolveWithObject: true })
      .then(({ data, info }) => ({ png: data, width: info.width, height: info.height }));
    if (resized.size > 64) resized.clear();
    resized.set(width, hit);
  }
  return hit;
};

/** Đóng dấu logo mờ vào góc dưới bên phải: dấu nằm thẳng trong điểm ảnh, không phải lớp phủ. Trả về WebP. */
export async function stampWatermark(input: Buffer, quality: number): Promise<Buffer> {
  const base = sharp(input, { animated: false });
  const meta = await base.metadata();
  if (!meta.width || !meta.height) return base.webp({ quality }).toBuffer();

  const mark = await loadLogo();
  const width = Math.max(MIN_WIDTH, Math.round(meta.width * WIDTH_RATIO));
  // Không để dấu to hơn ảnh nhỏ
  const fitted = Math.min(width, Math.floor(meta.width / 2));
  const overlayMeta = await overlayFor(mark, fitted);
  const overlay = overlayMeta.png;
  const margin = Math.round(meta.width * MARGIN_RATIO);

  return base
    .composite([
      {
        input: overlay,
        left: Math.max(0, meta.width - overlayMeta.width - margin),
        top: Math.max(0, meta.height - overlayMeta.height - margin),
      },
    ])
    .webp({ quality })
    .toBuffer();
}
