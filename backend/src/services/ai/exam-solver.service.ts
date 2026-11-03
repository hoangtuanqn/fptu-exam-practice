import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { AI_IMAGE_MAX_EDGE, DEFAULT_PROMPT_FILE, type AiConfig } from "../../constants/ai";
import { askClaude, type ClaudeContent } from "./claude.client";

export interface SolveQuestion {
  number: number; // số câu trong đề (1..N)
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
  report: string; // báo cáo của AI kèm danh sách câu chưa chắc
}

type Confidence = "certain" | "likely" | "unsure";
interface ClaudeAnswer {
  question: number;
  choice: string;
  confidence: Confidence;
}
interface ClaudeOutput {
  report: string;
  answers: ClaudeAnswer[];
}

const MIME: Record<string, "image/webp" | "image/png" | "image/jpeg"> = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};
const CHOICE = /^[A-Z](?: [A-Z])*$/;

// Cấu trúc kết quả bắt buộc (structured outputs): Claude luôn trả JSON đúng dạng này, không phải tự cắt chữ từ đoạn văn
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    report: {
      type: "string",
      description: "Short plain-text review: multi-answer questions, disagreements with comments, doubtful or faulty questions, anything unverified.",
    },
    answers: {
      type: "array",
      description: "Exactly one entry per question number from 1 to N.",
      items: {
        type: "object",
        properties: {
          question: { type: "integer", description: "Question number from the image label." },
          choice: {
            type: "string",
            description: "Uppercase letters, separated by single spaces when several answers are required, for example 'C' or 'A C D'.",
          },
          confidence: { type: "string", enum: ["certain", "likely", "unsure"] },
        },
        required: ["question", "choice", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["report", "answers"],
  additionalProperties: false,
};

// Prompt hệ thống (assets/prompts/exam-solver.system.md hoặc AI_PROMPT_FILE). Cố định cho mọi đề để được cache.
async function loadPrompt(): Promise<string> {
  const file = process.env.AI_PROMPT_FILE ? path.resolve(process.env.AI_PROMPT_FILE) : DEFAULT_PROMPT_FILE;
  try {
    return await fs.readFile(file, "utf-8");
  } catch {
    throw new Error(`Không đọc được file prompt hệ thống: ${file}`);
  }
}

// Kiểm tra kết quả: đủ N câu, không trùng, mỗi đáp án là các chữ cái. Sai thì ném lỗi, tuyệt đối không điền đáp án giả.
export function validateOutput(out: ClaudeOutput, numbers: number[]): SolveResult {
  const byNumber = new Map<number, ClaudeAnswer>();
  for (const a of out.answers ?? []) {
    if (byNumber.has(a.question)) throw new Error(`Claude trả lặp câu ${a.question}`);
    byNumber.set(a.question, a);
  }
  const missing = numbers.filter((n) => !byNumber.has(n));
  if (missing.length) throw new Error(`Claude thiếu đáp án ở câu ${missing.join(", ")}`);

  const answers: string[] = [];
  const bad: number[] = [];
  const unsure: number[] = [];
  for (const n of numbers) {
    const a = byNumber.get(n)!;
    const choice = a.choice.toUpperCase().replace(/[.,;]+/g, " ").replace(/\s+/g, " ").trim();
    if (!CHOICE.test(choice)) bad.push(n);
    if (a.confidence === "unsure") unsure.push(n);
    answers.push(choice);
  }
  if (bad.length) throw new Error(`Claude trả đáp án không phải chữ cái ở câu ${bad.join(", ")} (chưa chấm được)`);

  const note = unsure.length ? `\n\n[System] Claude marked these questions as unsure: ${unsure.join(", ")}.` : "";
  return { answers, report: `${out.report.trim()}${note}` };
}

// Ảnh đủ nhỏ thì gửi nguyên bản; lớn hơn thì thu nhỏ về AI_IMAGE_MAX_EDGE (giữ tỉ lệ, WebP chất lượng cao) để bớt token
async function prepareImage(file: string, mediaType: "image/webp" | "image/png" | "image/jpeg") {
  const raw = await fs.readFile(file);
  const meta = await sharp(raw).metadata().catch(() => null);
  if (!meta?.width || !meta.height || Math.max(meta.width, meta.height) <= AI_IMAGE_MAX_EDGE) {
    return { mediaType, data: raw.toString("base64") };
  }
  const resized = await sharp(raw)
    .resize({ width: AI_IMAGE_MAX_EDGE, height: AI_IMAGE_MAX_EDGE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();
  return { mediaType: "image/webp" as const, data: resized.toString("base64") };
}

/** Gửi toàn bộ ảnh + bình luận cho Claude và đọc lại danh sách đáp án theo cấu trúc cố định. */
export async function solveExam(config: AiConfig, input: SolveInput): Promise<SolveResult> {
  if (!config.anthropicApiKey) throw new Error("Chưa cấu hình khóa Anthropic");
  const n = input.questions.length;
  if (n === 0) throw new Error("Đề không có câu nào");

  const content: ClaudeContent[] = [
    { type: "text", text: `<exam>\nTitle: ${input.title || "(unknown)"}\nNumber of questions (N): ${n}\n</exam>` },
  ];
  for (const q of input.questions) {
    const mediaType = MIME[path.extname(q.file).toLowerCase()];
    if (!mediaType) throw new Error(`Định dạng ảnh không được hỗ trợ: ${path.basename(q.file)}`);
    const image = await prepareImage(q.file, mediaType);
    content.push({ type: "text", text: `Question ${q.number} (file ${path.basename(q.file)}):` });
    content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
  }
  content.push({
    type: "text",
    text: input.commentsText
      ? `<comments>\n${input.commentsText}\n</comments>\n\nSolve all ${n} questions following your instructions.`
      : `There are no forum comments for this exam, so solve everything yourself.\n\nSolve all ${n} questions following your instructions.`,
  });

  const out = (await askClaude({
    apiKey: config.anthropicApiKey,
    model: config.claudeModel,
    effort: config.effort,
    system: await loadPrompt(),
    content,
    schema: OUTPUT_SCHEMA,
    useSearch: config.useSearch,
  })) as ClaudeOutput;

  return validateOutput(out, input.questions.map((q) => q.number));
}
