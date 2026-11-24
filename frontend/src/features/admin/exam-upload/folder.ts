// Kiểm tra thư mục đề trước khi tải lên: images/Q1.webp … Qn.webp và ans.json nằm cạnh images/. Thiếu một trong hai thì là thư mục tài liệu.
// Không import gì để script kiểm tra (scripts/check-exam-folder.mjs) chạy thẳng bằng node. Máy chủ vẫn kiểm tra lại.
export const MAX_FOLDER_IMAGES = 100;
export const MAX_FOLDER_IMAGE_MB = 10;
const MAX_BYTES = MAX_FOLDER_IMAGE_MB * 1024 * 1024;
const NAME = /^Q(\d+)\.webp$/i;
const LETTER = /^[A-H]$/;

export interface FolderEntry<F> {
  path: string; // đường dẫn tương đối, vd "rendered/images/Q1.webp"
  file: F;
}

export interface FolderItem<F> {
  number: number;
  file: F;
  answer: string[];
}

export interface FolderCheck<F> {
  root: string | null; // "" = chính thư mục đã chọn; null = không tìm thấy images/
  items: FolderItem<F>[]; // xếp theo số câu
  ansFile: F | null;
  replaced: number[]; // chế độ bổ sung: các câu sẽ bị thay ảnh
  errors: string[];
  warnings: string[];
}

const depth = (dir: string) => (dir ? dir.split("/").length : 0);
const list = (ns: number[]) => (ns.length > 12 ? `${ns.slice(0, 12).join(", ")}… (${ns.length} câu)` : ns.join(", "));

/** Tìm thư mục gốc của đề: thư mục chứa images/ (ưu tiên có ans.json cạnh bên), nông nhất. */
export function findRoot(paths: string[]): { root: string | null; others: string[] } {
  const roots = new Set<string>();
  for (const p of paths) {
    const m = /^(?:(.*)\/)?images\/[^/]+$/.exec(p);
    if (m) roots.add(m[1] ?? "");
  }
  const withAns = [...roots].filter((r) => paths.includes(ansPathOf(r)));
  const pool = (withAns.length ? withAns : [...roots]).sort((a, b) => depth(a) - depth(b) || a.localeCompare(b));
  return { root: pool[0] ?? null, others: pool.slice(1) };
}

export const ansPathOf = (root: string) => (root ? `${root}/ans.json` : "ans.json");

/** Có images/ và ans.json ở thư mục gốc đề -> đề trắc nghiệm; còn lại lưu thành tài liệu. */
export function isQuizFolder(paths: string[]): boolean {
  const { root } = findRoot(paths);
  return root !== null && paths.includes(ansPathOf(root));
}

// Trùng danh sách đuôi TYPES ở backend/src/utils/attachment.ts
export const RESOURCE_EXTS = ["pdf", "zip", "rar", "7z", "txt", "md", "mp3", "wav", "ogg", "opus", "mp4", "m4v", "avi", "mov", "mpeg", "mpg", "ogv", "webm"];
const extOf = (path: string) => {
  const name = path.slice(path.lastIndexOf("/") + 1);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
};

export interface ResourceCheck<F> {
  files: FolderEntry<F>[]; // sẽ tải lên
  skipped: string[]; // đường dẫn tệp có đuôi không được nhận
  errors: string[];
  warnings: string[];
}

/** Thư mục tài liệu: giữ tệp có đuôi được phép, kiểm tra cỡ từng tệp và số tệp (tổng dung lượng kiểm ở form). */
export function checkResources<F extends { size: number }>(entries: FolderEntry<F>[]): ResourceCheck<F> {
  const files = entries.filter((e) => RESOURCE_EXTS.includes(extOf(e.path)));
  const skipped = entries.filter((e) => !RESOURCE_EXTS.includes(extOf(e.path))).map((e) => e.path);
  const errors: string[] = [];
  const warnings: string[] = [];
  if (findRoot(entries.map((e) => e.path)).root !== null) warnings.push("Thiếu ans.json nên sẽ lưu thành tài nguyên. Ảnh câu hỏi (webp) không phải loại tệp tài liệu nên sẽ bị bỏ qua.");
  const tooBig = files.filter((e) => e.file.size > MAX_BYTES).map((e) => e.path);
  if (!files.length) errors.push("Thư mục không có tệp nào dùng được. Chỉ nhận PDF, ZIP/RAR/7Z, TXT/MD, âm thanh (MP3, WAV, OGG...) và video (MP4, WEBM, MOV...).");
  if (tooBig.length) errors.push(`Tệp nặng hơn ${MAX_FOLDER_IMAGE_MB} MB: ${tooBig.slice(0, 12).join(", ")}${tooBig.length > 12 ? "…" : ""}.`);
  if (files.length > MAX_FOLDER_IMAGES) errors.push(`Tối đa ${MAX_FOLDER_IMAGES} tệp mỗi lần, thư mục có ${files.length} tệp dùng được.`);
  return { files, skipped, errors, warnings };
}

/** Đọc ans.json: {"Q1.webp": ["B"], "Q2.webp": ["A","C"]} -> đáp án theo số câu. */
export function parseAnsJson(text: string): { byNumber: Map<number, string[]>; errors: string[]; unknownKeys: string[] } {
  const byNumber = new Map<number, string[]>();
  const errors: string[] = [];
  const unknownKeys: string[] = [];
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { byNumber, errors: ["ans.json không đúng định dạng JSON."], unknownKeys };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { byNumber, errors: ["ans.json phải là một đối tượng dạng {\"Q1.webp\": [\"A\"]}."], unknownKeys };
  const bad: string[] = [];
  for (const [key, value] of Object.entries(data)) {
    const m = NAME.exec(key);
    if (!m) {
      unknownKeys.push(key);
      continue;
    }
    const letters = Array.isArray(value) ? value.map((v) => (typeof v === "string" ? v.trim().toUpperCase() : "")) : null;
    if (!letters || !letters.every((l) => LETTER.test(l))) {
      bad.push(key);
      continue;
    }
    byNumber.set(Number(m[1]), [...new Set(letters)].sort());
  }
  if (bad.length) errors.push(`Đáp án không hợp lệ (chỉ nhận các chữ A-H) ở: ${bad.slice(0, 12).join(", ")}${bad.length > 12 ? "…" : ""}.`);
  return { byNumber, errors, unknownKeys };
}

/**
 * Gom kết quả kiểm tra thư mục. `currentMax` = số câu hiện có của đề (chế độ bổ sung); bỏ trống = tạo đề mới.
 * Tạo mới: số câu phải liền 1..N. Bổ sung: câu đã có thì thay ảnh, câu mới phải nối tiếp từ currentMax + 1.
 */
export function checkFolder<F extends { size: number }>(entries: FolderEntry<F>[], ansText: string | null, currentMax?: number): FolderCheck<F> {
  const paths = entries.map((e) => e.path);
  const { root, others } = findRoot(paths);
  const errors: string[] = [];
  const warnings: string[] = [];
  const empty: FolderCheck<F> = { root, items: [], ansFile: null, replaced: [], errors, warnings };
  if (root === null) {
    errors.push("Không thấy thư mục images trong thư mục đã chọn.");
    return empty;
  }
  if (others.length) warnings.push(`Có nhiều thư mục đề, đang dùng "${root || "thư mục đã chọn"}". Bỏ qua: ${others.join(", ")}.`);

  const prefix = root ? `${root}/` : "";
  const ansEntry = entries.find((e) => e.path === ansPathOf(root)) ?? null;
  const images = entries.filter((e) => e.path.startsWith(`${prefix}images/`) && !e.path.slice(prefix.length + 7).includes("/"));

  const badNames: string[] = [];
  const tooBig: string[] = [];
  const seen = new Map<number, FolderEntry<F>>();
  const dup: number[] = [];
  for (const e of images) {
    const name = e.path.slice(prefix.length + 7);
    const m = NAME.exec(name);
    if (!m) {
      badNames.push(name);
      continue;
    }
    const n = Number(m[1]);
    if (n < 1) badNames.push(name);
    else if (seen.has(n)) dup.push(n);
    else seen.set(n, e);
    if (e.file.size > MAX_BYTES) tooBig.push(name);
  }
  if (badNames.length) errors.push(`Tên ảnh phải có dạng Q<số>.webp: ${badNames.slice(0, 12).join(", ")}${badNames.length > 12 ? "…" : ""}.`);
  if (dup.length) errors.push(`Trùng số câu: ${list(dup)}.`);
  if (tooBig.length) errors.push(`Ảnh nặng hơn ${MAX_FOLDER_IMAGE_MB} MB: ${tooBig.slice(0, 12).join(", ")}.`);
  if (seen.size === 0) errors.push("Thư mục images chưa có ảnh nào.");
  if (seen.size > MAX_FOLDER_IMAGES) errors.push(`Tối đa ${MAX_FOLDER_IMAGES} ảnh mỗi lần, thư mục có ${seen.size} ảnh.`);

  const numbers = [...seen.keys()].sort((a, b) => a - b);
  const base = currentMax ?? 0;
  const replaced = numbers.filter((n) => n <= base);
  const fresh = numbers.filter((n) => n > base);
  const missing: number[] = [];
  const top = fresh.length ? fresh[fresh.length - 1]! : base;
  for (let n = base + 1; n <= top; n++) if (!seen.has(n)) missing.push(n);
  if (missing.length) errors.push(currentMax === undefined ? `Thiếu ảnh câu: ${list(missing)}.` : `Câu mới phải nối tiếp từ câu ${base + 1}. Thiếu ảnh câu: ${list(missing)}.`);

  let byNumber = new Map<number, string[]>();
  if (ansText === null) warnings.push("Không có ans.json: đề sẽ chưa có đáp án.");
  else {
    const parsed = parseAnsJson(ansText);
    byNumber = parsed.byNumber;
    errors.push(...parsed.errors);
    const orphan = [...byNumber.keys()].filter((n) => !seen.has(n)).sort((a, b) => a - b);
    if (orphan.length) warnings.push(`ans.json có đáp án cho câu không có ảnh (bỏ qua): ${list(orphan)}.`);
    if (parsed.unknownKeys.length) warnings.push(`ans.json có ${parsed.unknownKeys.length} mục không phải tên ảnh, đã bỏ qua.`);
    const noAnswer = numbers.filter((n) => !byNumber.get(n)?.length);
    if (noAnswer.length && noAnswer.length < numbers.length) warnings.push(`Chưa có đáp án: câu ${list(noAnswer)}.`);
    else if (noAnswer.length && numbers.length) warnings.push("ans.json không có đáp án cho ảnh nào.");
  }

  const items = numbers.map((number) => ({ number, file: seen.get(number)!.file, answer: byNumber.get(number) ?? [] }));
  return { root, items, ansFile: ansEntry?.file ?? null, replaced, errors, warnings };
}
