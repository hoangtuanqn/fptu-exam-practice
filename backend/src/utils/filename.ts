/** Làm sạch chuỗi để dùng làm tên file/thư mục trên Windows. */
export function sanitizeName(input: string, fallback = "untitled"): string {
  const cleaned = input
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/, "");
  return cleaned || fallback;
}

/** Bỏ phần mở rộng: "Q1.jpg" -> "Q1" */
export function stripExt(name: string): string {
  return name.replace(/\.[A-Za-z0-9]{2,5}$/, "");
}

/** Tạo tên không trùng: "Q1", "Q1-2", "Q1-3"... */
export function uniqueName(base: string, used: Set<string>): string {
  let name = base;
  let n = 2;
  while (used.has(name.toLowerCase())) name = `${base}-${n++}`;
  used.add(name.toLowerCase());
  return name;
}
