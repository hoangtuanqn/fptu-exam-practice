import fs from "node:fs/promises";
import path from "node:path";
import { DEFAULT_PROMPT_FILE, type AiConfig } from "../../constants/ai";
import { generateContent, type GeminiPart } from "./gemini.client";

export interface SolveQuestion {
  name: string; // tên ảnh, ví dụ "Q1"
  file: string; // đường dẫn tuyệt đối tới ảnh
}

export interface SolveInput {
  title: string;
  questions: SolveQuestion[];
  commentsText: string | null; // nội dung comments.txt (nếu có)
}

export interface SolveResult {
  answers: string[]; // đáp án từng câu theo đúng thứ tự, ví dụ ["A", "C D", ...]
  report: string; // phần báo cáo của AI (câu nghi ngờ, câu nhiều đáp án...)
}

const MIME: Record<string, string> = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg" };
const ANSWER_LINE = /^[A-Z](?: [A-Z])*$/;

// Prompt hệ thống do bạn soạn (assets/prompts/huong-dan-giai-de.md hoặc AI_PROMPT_FILE)
async function loadPrompt(): Promise<string> {
  const file = process.env.AI_PROMPT_FILE ? path.resolve(process.env.AI_PROMPT_FILE) : DEFAULT_PROMPT_FILE;
  try {
    return await fs.readFile(file, "utf-8");
  } catch {
    throw new Error(`Không đọc được file prompt hệ thống: ${file}`);
  }
}

// Phần bổ sung cho chế độ chạy qua API: prompt gốc viết cho một trợ lý có công cụ (viết script, tạo file, ...)
const apiAddendum = (n: number, title: string) => `

---
## PHẦN BỔ SUNG KHI CHẠY QUA API (ưu tiên cao nhất, ghi đè mọi chỗ mâu thuẫn ở trên)

- Bạn đang chạy qua API: không có shell, Python hay hệ thống file. Mọi bước "viết script", "tạo file", "đường dẫn file" hãy bỏ qua; tự đối chiếu bình luận bằng suy luận. Nếu có công cụ tìm kiếm Google thì dùng cho các câu không chắc (bước 4).
- Tên đề: ${title || "(không rõ)"}. Số câu: **${n}**.
- Các ảnh đề được gửi lần lượt, mỗi ảnh có nhãn "Ảnh k — tên file". **Dòng k của kết quả ứng với ảnh thứ k** trong danh sách tôi gửi.
- **ĐỊNH DẠNG TRẢ LỜI BẮT BUỘC**: phần cuối câu trả lời là MỘT khối mã mở bằng \`\`\`ans và đóng bằng \`\`\`, chứa **đúng ${n} dòng**, mỗi dòng là đáp án của câu tương ứng (một chữ cái hoa, hoặc nhiều chữ cái cách nhau một dấu cách nếu đề yêu cầu chọn nhiều). Không đánh số, không chú thích, không dòng trống trong khối này. Trước khối đó, viết báo cáo ngắn theo mục 5 (câu nhiều đáp án, câu nghi ngờ và lý do, câu lệch với bình luận).
`;

// Lấy khối \`\`\`ans cuối cùng; nếu AI quên nhãn thì lấy khối mã cuối cùng có đúng n dòng hợp lệ
export function parseAnswers(text: string, n: number): { answers: string[]; report: string } {
  const blocks = [...text.matchAll(/```[a-zA-Z]*\s*\n([\s\S]*?)```/g)];
  const candidates = blocks.map((m) => ({ index: m.index ?? 0, lines: m[1]!.split(/\r?\n/).map((l) => l.trim()).filter(Boolean) }));
  const pick = [...candidates].reverse().find((c) => c.lines.length === n) ?? candidates[candidates.length - 1];
  if (!pick) throw new Error("AI không trả về khối đáp án");
  if (pick.lines.length !== n) throw new Error(`AI trả về ${pick.lines.length} dòng đáp án, đề có ${n} câu`);

  const bad: number[] = [];
  const answers = pick.lines.map((line, i) => {
    const normalized = line.toUpperCase().replace(/[.,;]+/g, " ").replace(/\s+/g, " ").trim();
    if (ANSWER_LINE.test(normalized)) return normalized;
    bad.push(i + 1);
    return line;
  });
  // Không điền đáp án giả: có câu không phải đáp án chữ cái thì coi như AI chưa giải xong đề
  if (bad.length) throw new Error(`AI trả về đáp án không hợp lệ ở câu ${bad.join(", ")}`);

  let report = text.slice(0, pick.index).trim();
  return { answers, report };
}

/** Gửi toàn bộ ảnh + bình luận + prompt hệ thống cho Gemini và đọc lại danh sách đáp án. */
export async function solveExam(config: AiConfig, input: SolveInput): Promise<SolveResult> {
  if (!config.apiKey) throw new Error("Chưa cấu hình khóa Gemini");
  const n = input.questions.length;
  if (n === 0) throw new Error("Đề không có câu nào");

  const system = (await loadPrompt()) + apiAddendum(n, input.title);

  const parts: GeminiPart[] = [
    { text: `Đây là bộ đề "${input.title}" gồm ${n} câu. Hãy giải theo đúng hướng dẫn trong chỉ dẫn hệ thống.` },
  ];
  for (const [i, q] of input.questions.entries()) {
    const data = (await fs.readFile(q.file)).toString("base64");
    parts.push({ text: `Ảnh ${i + 1} — ${path.basename(q.file)} (${q.name}):` });
    parts.push({ inlineData: { mimeType: MIME[path.extname(q.file).toLowerCase()] ?? "image/webp", data } });
  }
  parts.push({
    text: input.commentsText
      ? `Nội dung comments.txt (bình luận của người dùng):\n\n${input.commentsText}`
      : "Không có comments.txt cho đề này, hãy tự giải và tra cứu.",
  });

  const text = await generateContent({ apiKey: config.apiKey, model: config.model, system, parts, useSearch: config.useSearch });
  return parseAnswers(text, n);
}
