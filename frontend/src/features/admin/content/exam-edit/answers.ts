// "C A" / "ACD" / "a c" -> ["A","C"]
export const lettersOf = (answer: string) => [...new Set(answer.toUpperCase().replace(/[^A-Z]/g, "").split(""))].sort();
export const normalize = (answer: string) => lettersOf(answer).join(" ");

/**
 * Đọc đáp án dán vào. Mỗi token (ngăn bởi dấu cách, phẩy, xuống dòng) là đáp án của một câu:
 *   "1A 2B 3C"  /  "1. A  2: B C"  -> theo số câu
 *   "A B C D"                      -> lần lượt cho các câu chưa là tài liệu tham khảo
 */
export function parsePasted(text: string, numbers: number[]): Map<number, string> {
  const result = new Map<number, string>();
  let seq = 0;
  for (const line of text.split(/[\n,;]+/)) {
    if (/\d/.test(line)) {
      // có số câu: "1A 2B", "3. A C", "4: B"
      for (const m of line.matchAll(/(\d+)\s*[.:)-]?\s*([A-Za-z]+(?:\s+[A-Za-z]+)*?)(?=\s*\d|\s*$)/g)) result.set(Number(m[1]), normalize(m[2]));
    } else {
      // không có số: mỗi từ là đáp án của câu kế tiếp
      for (const t of line.trim().split(/\s+/)) {
        if (!/^[A-Za-z]+$/.test(t)) continue;
        const n = numbers[seq++];
        if (n !== undefined) result.set(n, normalize(t));
      }
    }
  }
  return result;
}
