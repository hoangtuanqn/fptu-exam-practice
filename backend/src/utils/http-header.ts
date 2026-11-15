// Header admin tự thêm không được đè các header máy chủ tự đặt (khoá, kiểu nội dung...) hay header nối kết (hop-by-hop)
const RESERVED = new Set([
  "authorization",
  "proxy-authorization",
  "proxy-connection",
  "content-type",
  "content-length",
  "content-encoding",
  "host",
  "accept",
  "connection",
  "keep-alive",
  "upgrade",
  "expect",
  "te",
  "trailer",
  "transfer-encoding",
  "cookie",
]);
// Giá trị chỉ gồm ASCII in được và tab
const LINE = /^([!#$%&'*+.^_`|~0-9A-Za-z-]+):[ \t]*([\x20-\x7E\t]*)$/;

/** Đọc một dòng "Tên: giá trị". Trả null khi rỗng, sai cú pháp (tên ngoài ký tự token, giá trị ngoài ASCII in được) hoặc là header dành riêng. */
export function parseExtraHeader(raw: string): [string, string] | null {
  const m = LINE.exec(raw.trim());
  if (!m || RESERVED.has(m[1]!.toLowerCase())) return null;
  return [m[1]!, m[2]!.trim()];
}
