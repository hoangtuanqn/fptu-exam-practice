import path from "node:path";
import sharp from "sharp";
import { IMAGE_HASH_CONCURRENCY } from "../constants/frequent";

// Dấu vân tay của ảnh câu hỏi, để nhận ra cùng một câu xuất hiện ở nhiều đề. Ảnh đề gần như toàn nền trắng với vài dòng chữ, nên băm cả ảnh sẽ nhầm
// những câu khác nhau có cùng bố cục. Vì vậy chỉ băm riêng vùng chữ: nửa phải phía trên (bỏ logo, hình mờ), cắt sát chữ, chia lưới GW x GH ô rồi ghi ô nào có mực.
// Cùng một câu (cùng nội dung, cùng cách dàn trang) cho ra dấu vân tay gần như giống hệt; câu khác nội dung thì khác hẳn.
// Hạn chế: câu bị đảo thứ tự đáp án hoặc đổi chữ thì không nhận ra là cùng câu.
const GW = 64;
const GH = 24;
const INK = 110; // điểm ảnh tối hơn mức này mới tính là chữ (logo nhạt màu bị bỏ qua)
const COVERED = 235; // ô lưới tối hơn mức này nghĩa là có chữ
export const HASH_BYTES = (GW * GH) / 8;
export const HASH_WORDS = HASH_BYTES / 4;

type Region = { left: number; top: number; width: number; height: number };

/** Đọc một vùng ảnh (xám) và tìm khung bao quanh phần chữ; null nếu vùng không có chữ. */
async function inkBox(file: string, region: Region) {
  const { data, info } = await sharp(file).extract(region).greyscale().raw().toBuffer({ resolveWithObject: true });
  let x0 = info.width;
  let x1 = -1;
  let y0 = info.height;
  let y1 = -1;
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[y * info.width + x]! < INK) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 > x0 && y1 > y0 ? { data, width: info.width, height: info.height, x0, x1, y0, y1 } : null;
}

/**
 * Dấu vân tay vùng chữ của một ảnh, hoặc null nếu ảnh không có chữ nhận ra được hoặc không đọc được.
 * Ảnh có hai kiểu dàn trang: chia đôi (số câu ở nửa trái, nội dung ở nửa phải: chỉ băm nửa phải vì số câu đổi theo từng đề)
 * và một cột (nội dung ở bên trái, bỏ dải tiêu đề phía trên): nửa phải trống thì băm cả chiều ngang.
 */
export async function hashQuestionImage(file: string): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const { width, height } = await sharp(file).metadata();
    if (!width || !height) return null;
    const bottom = Math.round(height * 0.6);
    const left = Math.round(width * 0.42);
    const top = Math.min(12, height - 1);
    const right = await inkBox(file, { left, top, width: width - left, height: Math.max(1, bottom - top) });
    const box = right ?? (await inkBox(file, { left: 0, top: Math.min(40, height - 1), width, height: Math.max(1, bottom - 40) }));
    if (!box) return null;

    const grid = await sharp(box.data, { raw: { width: box.width, height: box.height, channels: 1 } })
      .extract({ left: box.x0, top: box.y0, width: box.x1 - box.x0 + 1, height: box.y1 - box.y0 + 1 })
      .resize(GW, GH, { fit: "fill" })
      .raw()
      .toBuffer();

    const out = new Uint8Array(new ArrayBuffer(HASH_BYTES));
    for (let i = 0; i < GW * GH; i++) if (grid[i]! < COVERED) out[i >> 3]! |= 1 << (i & 7);
    return out;
  } catch {
    return null;
  }
}

/**
 * Tính dấu vân tay cho từng ảnh (đường dẫn tương đối trong `root`), mỗi lần `concurrency` ảnh song song.
 * Ảnh tính được thì gọi `onHash` (người gọi tự lưu). Trả về số ảnh tính được; ảnh không đọc được bị bỏ qua.
 */
export async function hashImagesInBatches<T extends { imagePath: string }>(
  rows: readonly T[],
  root: string,
  onHash: (row: T, hash: Uint8Array<ArrayBuffer>) => Promise<void>,
  concurrency = IMAGE_HASH_CONCURRENCY,
): Promise<number> {
  const step = Math.max(1, Math.floor(concurrency));
  let hashed = 0;
  for (let i = 0; i < rows.length; i += step) {
    await Promise.all(
      rows.slice(i, i + step).map(async (r) => {
        const hash = await hashQuestionImage(path.join(root, r.imagePath));
        if (hash) {
          await onHash(r, hash);
          hashed++;
        }
      }),
    );
  }
  return hashed;
}

/** Đổi dấu vân tay sang mảng 32-bit để so sánh nhanh. */
export const toWords = (hash: Uint8Array) => {
  const words = new Uint32Array(HASH_WORDS);
  for (let i = 0; i < HASH_WORDS; i++) words[i] = (hash[i * 4]! | (hash[i * 4 + 1]! << 8) | (hash[i * 4 + 2]! << 16) | (hash[i * 4 + 3]! << 24)) >>> 0;
  return words;
};

const popcount = (v: number) => {
  v -= (v >>> 1) & 0x55555555;
  v = (v & 0x33333333) + ((v >>> 2) & 0x33333333);
  return (((v + (v >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
};

/** Số bit khác nhau giữa hai dấu vân tay; vượt `limit` thì dừng sớm và trả về limit + 1. */
export function hammingWithin(a: Uint32Array, b: Uint32Array, limit: number) {
  let d = 0;
  for (let i = 0; i < HASH_WORDS; i++) {
    d += popcount((a[i]! ^ b[i]!) >>> 0);
    if (d > limit) return limit + 1;
  }
  return d;
}
