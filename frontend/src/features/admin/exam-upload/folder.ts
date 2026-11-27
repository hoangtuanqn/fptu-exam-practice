// Kiểm tra thư mục đề trước khi tải lên: images/Q1.webp … Qn.webp, ans.json (không bắt buộc) nằm cạnh images/. Thư mục khác là thư mục tài liệu.
// Không import gì để script kiểm tra (scripts/check-exam-folder.mjs) chạy thẳng bằng node. Máy chủ vẫn kiểm tra lại.
export const MAX_FOLDER_IMAGES = 100;
export const MAX_FOLDER_IMAGE_MB = 10;
const MAX_BYTES = MAX_FOLDER_IMAGE_MB * 1024 * 1024;
const NAME = /^Q(\d+)\.webp$/i;
const LETTER = /^[A-H]$/;
const SYSTEM_FILE = /(^|\/)(\.DS_Store|Thumbs\.db|desktop\.ini)$/i;

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

// Loại đề đoán từ tên đề (cùng quy tắc với backend utils/exam-kind): từ khoá FE/PE/Quiz không dính chữ/số hai bên, ví dụ "MSS301 - SU26 - PE - RE" là PE. Không thấy thì null.
const KIND_TOKEN = /(?<![A-Za-z0-9])(?:(FE|final[\s_-]*exam)|(PE|practical[\s_-]*exam)|(quizz?(?:es)?))(?![A-Za-z0-9])/i;
export function kindFromTitle(title: string): "FE" | "PE" | "QUIZ" | null {
  const m = KIND_TOKEN.exec(title);
  return m ? (m[1] ? "FE" : m[2] ? "PE" : "QUIZ") : null;
}

/** Tên thư mục đã chọn ("ENM302 - SU26 - B5 - FE - L") làm tên đề; mã môn là phần đầu tên ("ENM302"), loại đề đoán theo kindFromTitle. null nếu tệp không nằm trong thư mục. */
export function nameFromFolder(paths: string[]): { title: string; subjectCode: string | null; kind: "FE" | "PE" | "QUIZ" | null } | null {
  const first = paths[0]?.split("/");
  const title = first && first.length > 1 ? first[0]!.trim() : "";
  if (!title) return null;
  return { title, subjectCode: /^[A-Za-z]{2,4}\d{3}[A-Za-z]?(?![A-Za-z0-9])/.exec(title)?.[0].toUpperCase() ?? null, kind: kindFromTitle(title) };
}

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

/**
 * Có ans.json cạnh images/ -> đề trắc nghiệm. Không có ans.json: vẫn là đề (chưa có đáp án) khi mọi tệp đều là images/Q<số>.webp.
 * Còn tệp khác thì lưu thành tài liệu, để không tệp nào bị bỏ.
 */
export function isQuizFolder(paths: string[]): boolean {
  const { root } = findRoot(paths);
  if (root === null) return false;
  if (paths.includes(ansPathOf(root))) return true;
  const images = root ? `${root}/images/` : "images/";
  return paths.every((p) => SYSTEM_FILE.test(p) || (p.startsWith(images) && NAME.test(p.slice(images.length))));
}

export interface ResourceCheck<F> {
  files: FolderEntry<F>[]; // sẽ tải lên (mọi tệp trong thư mục)
  errors: string[];
  warnings: string[];
}

/** Thư mục tài liệu: lấy mọi tệp, kiểm tra cỡ từng tệp và số tệp (tổng dung lượng kiểm ở form). */
export function checkResources<F extends { size: number }>(entries: FolderEntry<F>[]): ResourceCheck<F> {
  const files = entries;
  const errors: string[] = [];
  const warnings: string[] = [];
  if (findRoot(entries.map((e) => e.path)).root !== null) warnings.push("Không có ans.json và còn tệp khác ngoài images/Q<số>.webp nên sẽ lưu thành tài nguyên (giữ nguyên mọi tệp, kể cả ảnh).");
  const tooBig = files.filter((e) => e.file.size > MAX_BYTES).map((e) => e.path);
  if (!files.length) errors.push("Thư mục không có tệp nào.");
  if (tooBig.length) errors.push(`Tệp nặng hơn ${MAX_FOLDER_IMAGE_MB} MB: ${tooBig.slice(0, 12).join(", ")}${tooBig.length > 12 ? "…" : ""}.`);
  if (files.length > MAX_FOLDER_IMAGES) errors.push(`Tối đa ${MAX_FOLDER_IMAGES} tệp mỗi lần, thư mục có ${files.length} tệp.`);
  return { files, errors, warnings };
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
