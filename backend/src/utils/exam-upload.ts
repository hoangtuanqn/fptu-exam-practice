import { EXAM_UPLOAD_NAMES_SHOWN, MANUAL_THREAD_PREFIX } from "../constants/exam-upload";

// Admin tải đề lên bằng tay: thư mục images/Q<số>.webp + ans.json {"Q1.webp": ["B"], "Q2.webp": ["A", "C"]}. Logic thuần, không DB.

type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const QUESTION_FILE = /^Q(\d{1,4})\.webp$/i;

/** Tên tệp (bỏ phần thư mục nếu trình duyệt gửi kèm) */
export const baseName = (name: string) => name.split(/[\\/]/).pop() ?? "";

/** Số câu theo tên tệp Q<số>.webp (không phân biệt hoa thường); null = sai dạng */
export function questionNumberOf(name: string): number | null {
  const m = QUESTION_FILE.exec(baseName(name));
  const n = m ? Number(m[1]) : 0;
  return n >= 1 ? n : null;
}

const list = (items: (string | number)[]) =>
  items.length > EXAM_UPLOAD_NAMES_SHOWN ? `${items.slice(0, EXAM_UPLOAD_NAMES_SHOWN).join(", ")}... (${items.length})` : items.join(", ");

/**
 * Số câu của từng ảnh (cùng thứ tự với `names`). `existingMax` = số câu lớn nhất đang có (0 = đề mới).
 * Số <= existingMax: thay ảnh câu đó (hoặc lấp chỗ trống). Số > existingMax: phải nối tiếp liền existingMax+1, existingMax+2... không hở.
 * Đề mới (existingMax = 0) vì vậy phải đủ đúng 1..N.
 */
export function planUploadNumbers(names: string[], existingMax: number): Result<number[]> {
  const bad = names.filter((n) => questionNumberOf(n) === null).map(baseName);
  if (bad.length) return { ok: false, error: `Tên ảnh phải có dạng Q<số>.webp (ví dụ Q1.webp). Ảnh sai tên: ${list(bad)}` };
  const numbers = names.map((n) => questionNumberOf(n)!);
  const seen = new Set(numbers);
  const dup = numbers.filter((n, i) => numbers.indexOf(n) !== i);
  if (dup.length) return { ok: false, error: `Có nhiều ảnh cho cùng một câu: ${list([...new Set(dup)].map((n) => `Q${n}`))}` };
  const top = Math.max(...numbers);
  const missing: number[] = [];
  for (let n = existingMax + 1; n <= top; n++) if (!seen.has(n)) missing.push(n);
  if (missing.length) {
    const from = existingMax === 0 ? "Đề mới phải có đủ ảnh từ Q1" : `Câu mới phải nối tiếp từ Q${existingMax + 1}`;
    return { ok: false, error: `${from}, không bỏ trống. Còn thiếu: ${list(missing.map((n) => `Q${n}`))}` };
  }
  return { ok: true, value: numbers };
}

/**
 * Đọc ans.json: khoá là tên ảnh (Q1.webp), giá trị là mảng chữ cái A-H. Trả đáp án theo số câu, viết như đáp án đã lưu ("A C").
 * Mảng rỗng = chưa biết đáp án (không ghi gì). Khoá không phải ảnh có trong lần tải này: bỏ qua, trả về trong `ignored`.
 */
export function parseAnswersJson(raw: string | undefined, uploaded: number[]): Result<{ answers: Map<number, string>; ignored: string[] }> {
  const answers = new Map<number, string>();
  const ignored: string[] = [];
  if (!raw?.trim()) return { ok: true, value: { answers, ignored } };
  let data: unknown;
  try {
    data = JSON.parse(raw.replace(/^﻿/, ""));
  } catch {
    return { ok: false, error: "Tệp đáp án (ans.json) không phải JSON hợp lệ" };
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, error: 'Tệp đáp án phải có dạng {"Q1.webp": ["B"], ...}' };
  const have = new Set(uploaded);
  for (const [key, value] of Object.entries(data)) {
    const n = questionNumberOf(key);
    if (n === null || !have.has(n)) {
      ignored.push(key);
      continue;
    }
    const letters = Array.isArray(value) ? value.map((v) => (typeof v === "string" ? v.trim().toUpperCase() : "")) : null;
    if (!letters || letters.some((l) => !/^[A-H]$/.test(l))) return { ok: false, error: `Đáp án của ${key} không hợp lệ: chỉ nhận mảng các chữ A-H, ví dụ ["A", "C"]` };
    if (answers.has(n)) return { ok: false, error: `Tệp đáp án có hai mục cho câu Q${n}` };
    if (letters.length) answers.set(n, [...new Set(letters)].sort().join(" "));
  }
  return { ok: true, value: { answers, ignored } };
}

export type ExamGap = "no_exam" | "no_images" | "no_answers";

/**
 * Đề còn thiếu gì (null = đủ). Câu SQL ở exam-gap.repository viết đúng điều kiện này, giữ hai chỗ khớp nhau.
 * - no_exam: bài trong danh mục FuOverflow chưa có đề nào cùng threadId.
 * - no_images: số câu đã lưu < totalQuestions, hoặc đề 0 câu mà cũng không có tệp đính kèm.
 * - no_answers: có ảnh đủ nhưng còn câu cần chấm (không phải tài liệu tham khảo) chưa có đáp án thật: nguồn đáp án không phải
 *   AI/MANUAL (DEFAULT là đáp án tạm, PENDING/FAILED là chưa giải được) hoặc còn câu đáp án rỗng. Đề chỉ có tệp thì không thiếu đáp án.
 */
export function classifyExamGap(e: { totalQuestions: number; questions: number; hasFiles: boolean; graded: number; filled: number; answerSource: string }): Exclude<ExamGap, "no_exam"> | null {
  if (e.questions < e.totalQuestions || (e.totalQuestions === 0 && !e.hasFiles)) return "no_images";
  if (e.graded > 0 && (!isRealAnswerSource(e.answerSource) || e.filled < e.graded)) return "no_answers";
  return null;
}

/** Đề admin tải tay không gắn bài FuOverflow (thread "m<hex>"): không bao giờ đọc thử, crawl hay làm mới từ FuOverflow. */
export const isManualThreadId = (threadId: string) => threadId.startsWith(MANUAL_THREAD_PREFIX);

export const isRealAnswerSource = (source: string) => source === "AI" || source === "MANUAL";
