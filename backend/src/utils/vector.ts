// Vector embedding lưu dạng float32 little-endian (768 số = 3 KB), gọn hơn nhiều so với mảng JSON
export const toBytes = (v: number[]) => Buffer.from(new Float32Array(v).buffer);
export const fromBytes = (b: Uint8Array) => new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));

// Vector đã chuẩn hoá độ dài 1 nên cosine = tích vô hướng
export const dotF32 = (a: Float32Array, b: Float32Array) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
};

// ---- Các hàm dưới đây kiểm tra số chiều và không bao giờ trả NaN (dùng cho nhóm câu giống nhau) ----

export class DimensionMismatchError extends Error {
  constructor(
    public readonly expected: number,
    public readonly actual: number,
  ) {
    super(`Vector dimension mismatch: expected ${expected}, got ${actual}`);
    this.name = "DimensionMismatchError";
  }
}

export const assertSameDimensions = (a: Float32Array, b: Float32Array) => {
  if (a.length !== b.length) throw new DimensionMismatchError(a.length, b.length);
};

/** Tích vô hướng, báo lỗi rõ ràng khi hai vector khác số chiều. */
export const dot = (a: Float32Array, b: Float32Array) => {
  assertSameDimensions(a, b);
  return dotF32(a, b);
};

export const norm = (v: Float32Array) => Math.sqrt(dotF32(v, v));

/** Bản sao có độ dài 1. Vector 0 (hoặc có NaN/Infinity) trả về vector 0 cùng số chiều, không sinh NaN. */
export const normalize = (v: Float32Array) => {
  const n = norm(v);
  const out = new Float32Array(v.length);
  if (!Number.isFinite(n) || n === 0) return out;
  for (let i = 0; i < v.length; i++) out[i] = v[i]! / n;
  return out;
};

/** Cosine trong [-1, 1]; có vector 0 thì bằng 0. */
export const cosine = (a: Float32Array, b: Float32Array) => {
  assertSameDimensions(a, b);
  const d = norm(a) * norm(b);
  if (!Number.isFinite(d) || d === 0) return 0;
  return Math.max(-1, Math.min(1, dotF32(a, b) / d));
};

export interface Scored<T> {
  id: T;
  score: number;
}

/** k ứng viên giống `query` nhất theo cosine, điểm cao trước; bằng điểm thì giữ thứ tự đầu vào. */
export function topK<T>(query: Float32Array, candidates: readonly { id: T; vector: Float32Array }[], k: number): Scored<T>[] {
  if (k <= 0) return [];
  return candidates
    .map((c, index) => ({ id: c.id, score: cosine(query, c.vector), index }))
    .sort((x, y) => y.score - x.score || x.index - y.index)
    .slice(0, k)
    .map(({ id, score }) => ({ id, score }));
}

/** Float32Array -> Buffer (bản sao) để ghi cột BLOB; chỉ lấy đúng phần của view, kể cả khi là subarray. */
export const vectorToBuffer = (v: Float32Array) => Buffer.from(new Uint8Array(v.buffer, v.byteOffset, v.byteLength));

/** Buffer từ cột BLOB -> Float32Array (bản sao căn lề 4 byte). Độ dài không chia hết cho 4 là dữ liệu hỏng. */
export const bufferToVector = (b: Uint8Array, dimensions?: number) => {
  if (b.byteLength % 4 !== 0) throw new Error(`Vector blob length ${b.byteLength} is not a multiple of 4`);
  const v = fromBytes(b);
  if (dimensions !== undefined && v.length !== dimensions) throw new DimensionMismatchError(dimensions, v.length);
  return v;
};
