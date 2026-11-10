// Vector embedding lưu dạng float32 little-endian (768 số = 3 KB), gọn hơn nhiều so với mảng JSON
export const toBytes = (v: number[]) => Buffer.from(new Float32Array(v).buffer);
export const fromBytes = (b: Uint8Array) => new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));

// Vector đã chuẩn hoá độ dài 1 nên cosine = tích vô hướng
export const dotF32 = (a: Float32Array, b: Float32Array) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
};
