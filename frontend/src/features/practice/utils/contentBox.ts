// Tìm vùng có chữ của một ảnh đề (gốc trên trái) để phóng vùng đó trên màn nhỏ; phần trắng thừa bên phải và bên dưới nằm ngoài khung.
// Thà không cắt còn hơn cắt mất chữ: ảnh nền màu (chụp cả phần mềm thi), nội dung lan gần góc logo hoặc lợi quá ít thì giữ nguyên.
export interface ContentBox {
  w: number; // phần bề rộng cần giữ (0-1)
  h: number; // phần chiều cao cần giữ (0-1)
}

const INK_BELOW = 235; // sáng hơn mức này coi là nền (gồm dải tiêu đề xanh rất nhạt)
const LOGO_X = 0.82; // góc phải dưới có logo chìm, không tính là nội dung
const LOGO_Y = 0.75;
const SAFE_X = 0.8; // nội dung vượt các mốc này là đã sát góc logo: không cắt chiều đó
const SAFE_Y = 0.72;
const MIN_GAIN = 0.85; // giữ lại hơn mức này thì cắt không đáng

/** `rgba` là điểm ảnh của bản thu nhỏ width x height; `pad` là lề thêm (px của bản thu nhỏ). null = hiện nguyên ảnh. */
export function contentBox(rgba: Uint8ClampedArray, width: number, height: number, pad: number): ContentBox | null {
  const light = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return rgba[i + 3]! < 128 ? 255 : 0.299 * rgba[i]! + 0.587 * rgba[i + 1]! + 0.114 * rgba[i + 2]!;
  };
  // Hai góc không có logo và không có vạch tiêu đề phải gần trắng
  if (light(width - 3, 2) < INK_BELOW || light(2, height - 3) < INK_BELOW) return null;

  let right = -1;
  let bottom = -1;
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      if (light(x, y) >= INK_BELOW || (x > width * LOGO_X && y > height * LOGO_Y)) continue;
      if (x > right) right = x;
      bottom = y;
    }
  if (right < 0) return null;

  const keep = (edge: number, size: number, safe: number) => {
    const part = Math.min(1, (edge + 1 + pad) / size);
    return edge > size * safe || part > MIN_GAIN ? 1 : part;
  };
  const w = keep(right, width, SAFE_X);
  const h = keep(bottom, height, SAFE_Y);
  return w === 1 && h === 1 ? null : { w, h };
}
