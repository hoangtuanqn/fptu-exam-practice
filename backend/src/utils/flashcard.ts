import path from "node:path";
import { FLASHCARD_MAX_CARDS, FLASHCARD_STORAGE_DIR } from "../constants/flashcard";

// shortcut: ảnh luôn là .webp đặt tên Q<số>; muốn nhận định dạng khác thì lưu tên tệp vào DB.
export const flashcardFileName = (number: number) => `Q${number}.webp`;
export const FLASHCARD_FILE_RE = /^Q[1-9]\d{0,3}\.webp$/;

/** Đường dẫn tương đối trong STORAGE_DIR (dùng "/"), cũng là thứ được ký. */
export const flashcardRel = (subjectCode: string, number: number) => `${FLASHCARD_STORAGE_DIR}/${subjectCode.toUpperCase()}/${flashcardFileName(number)}`;

const STATIC_PREFIX = new RegExp(`^/${FLASHCARD_STORAGE_DIR}(?:/|$)`, "i");

/** Đường dẫn tĩnh (req.path) thuộc flashcards/: giải mã, chuẩn hoá rồi mới so để không lách được bằng mã hoá/viết hoa. Lỗi giải mã coi như thuộc (chặn). */
export function isFlashcardStaticPath(p: string): boolean {
  try {
    return STATIC_PREFIX.test(path.posix.normalize(`/${decodeURIComponent(p).replace(/\\/g, "/")}`));
  } catch {
    return true;
  }
}

export interface FlashcardSet {
  cards: { number: number; answer: string }[];
}

/**
 * Kiểm tra bộ thẻ sắp nhập: tên ảnh Q1..Qn liền nhau, đáp án là mảng các mảng chữ cái, phần tử thứ i là đáp án của câu i+1.
 * Trả bộ thẻ hợp lệ, hoặc danh sách lỗi (không nhập gì khi có lỗi).
 */
export function checkFlashcardSet(imageNames: readonly string[], answers: unknown): { ok: true; set: FlashcardSet } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(answers)) return { ok: false, errors: ["answers.json phải là một mảng, phần tử thứ i là đáp án của câu i+1"] };
  if (answers.length === 0 || answers.length > FLASHCARD_MAX_CARDS) errors.push(`Số đáp án không hợp lệ: ${answers.length}`);

  const have = new Set(imageNames);
  const stray = imageNames.filter((n) => !FLASHCARD_FILE_RE.test(n));
  if (stray.length) errors.push(`Tên ảnh sai dạng Q<số>.webp: ${stray.slice(0, 5).join(", ")}${stray.length > 5 ? "…" : ""}`);
  const missing: number[] = [];
  for (let n = 1; n <= answers.length; n++) if (!have.has(flashcardFileName(n))) missing.push(n);
  if (missing.length) errors.push(`Thiếu ảnh cho ${missing.length} câu: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "…" : ""}`);
  const extra = imageNames.filter((n) => FLASHCARD_FILE_RE.test(n) && Number(n.slice(1, -5)) > answers.length);
  if (extra.length) errors.push(`Có ${extra.length} ảnh không có đáp án (từ câu ${answers.length + 1}): ${extra.slice(0, 5).join(", ")}${extra.length > 5 ? "…" : ""}`);

  const cards = answers.map((a, i) => {
    const letters = Array.isArray(a) ? a.map((x) => String(x).trim().toUpperCase()) : [];
    if (letters.length === 0 || letters.some((l) => !/^[A-H]$/.test(l)) || new Set(letters).size !== letters.length) errors.push(`Đáp án câu ${i + 1} không hợp lệ: ${JSON.stringify(a)}`);
    return { number: i + 1, answer: letters.join(" ") };
  });
  return errors.length ? { ok: false, errors } : { ok: true, set: { cards } };
}
