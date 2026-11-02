import type { Question } from "@/features/practice/types.ts";

// Đọc danh sách file người dùng chọn -> trả về danh sách câu hỏi đã sắp xếp
export async function parseFolder(list: File[]): Promise<Question[]> {

  // Ảnh: tên dạng "1.webp", "Q1.webp"... (cho phép tiền tố chữ, lấy số làm số câu)
  const images = new Map<number, string>();
  for (const file of list) {
    const match = file.name.match(/^\D*(\d+)\.webp$/i);
    if (match) images.set(Number(match[1]), URL.createObjectURL(file));
  }

  // Đáp án: ans.txt, dòng i = đáp án câu i
  const ansFile = list.find((f) => f.name.toLowerCase() === "ans.txt");
  const answers = ansFile ? parseAnswers(await ansFile.text()) : [];

  return [...images.keys()]
    .sort((a, b) => a - b)
    .map((n) => ({
      number: n,
      imageUrl: images.get(n)!,
      correct: answers[n - 1] ?? [],
    }));
}

// Mỗi dòng: "A" hoặc "A B C" (cách nhau bởi dấu cách) -> ["A","B","C"]
function parseAnswers(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().toUpperCase().split(/\s+/).filter(Boolean));
}
