import path from "node:path";
import { strToU8, zipSync, type Zippable } from "fflate";
import { USABLE_ANSWER_SOURCES } from "../constants/exam";

export type ExportQuestion = { number: number; imagePath: string | null; answer: string | null };

// Đề chưa có đáp án thật (DEFAULT/PENDING/FAILED) giữ đáp án tạm "A": bỏ hết để file đáp án không ghi sai
export const withTrustedAnswers = <T extends { answer: string | null }>(questions: T[], answerSource: string): T[] =>
  (USABLE_ANSWER_SOURCES as readonly string[]).includes(answerSource) ? questions : questions.map((q) => ({ ...q, answer: "" }));

// "bcd", "B,C,D", "B C D" -> "B C D"; rỗng/null -> "" (chưa có đáp án)
export const normalizeAnswer = (raw: string | null | undefined) => (raw ?? "").toUpperCase().match(/[A-Z]/g)?.join(" ") ?? "";

// Một dòng "<số câu> <các chữ>" cho mỗi câu ĐÃ có đáp án, theo thứ tự số câu, có xuống dòng cuối
export const buildAnswerText = (questions: ExportQuestion[]) =>
  [...questions]
    .sort((a, b) => a.number - b.number)
    .map((q) => ({ n: q.number, a: normalizeAnswer(q.answer) }))
    .filter((q) => q.a)
    .map((q) => `${q.n} ${q.a}\n`)
    .join("");

// Đường dẫn tuyệt đối của imagePath (tương đối, dùng "/") nếu nó nằm trong root; ngược lại null
export const resolveInside = (root: string, rel: string) => {
  const abs = path.resolve(root, rel);
  const inside = path.relative(root, abs);
  return inside && !inside.startsWith("..") && !path.isAbsolute(inside) ? abs : null;
};

const extOf = (imagePath: string) => {
  const ext = path.extname(imagePath).toLowerCase();
  return /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : "";
};

export class ExamZipTooLarge extends Error {}

/**
 * Zip gồm đúng hai thư mục: images/NN.ext (ảnh từng câu, NN đệm 0 theo số câu lớn nhất) và dap-an/dap-an.txt.
 * Ảnh không đọc được hoặc đường dẫn ra ngoài root thì bỏ qua, trả số câu trong `skipped`.
 */
export async function buildExamZip(
  questions: ExportQuestion[],
  opts: { root: string; readFile: (absPath: string) => Promise<Uint8Array>; maxBytes: number },
) {
  const width = String(Math.max(0, ...questions.map((q) => q.number))).length;
  const images: Zippable = {};
  const skipped: number[] = [];
  let total = 0;
  for (const q of questions) {
    if (!q.imagePath) continue;
    const abs = resolveInside(opts.root, q.imagePath);
    const data = abs ? await opts.readFile(abs).catch(() => null) : null;
    if (!data) {
      skipped.push(q.number);
      continue;
    }
    total += data.byteLength;
    if (total > opts.maxBytes) throw new ExamZipTooLarge();
    images[`${String(q.number).padStart(width, "0")}${extOf(q.imagePath)}`] = [data, { level: 0 }]; // ảnh đã nén sẵn
  }
  const zip = zipSync({ images, "dap-an": { "dap-an.txt": strToU8(buildAnswerText(questions)) } }, { level: 6 });
  return { zip, skipped };
}
