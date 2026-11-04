import fs from "node:fs/promises";
import path from "node:path";
import { AI_BATCH_SIZE, AI_MAX_PARALLEL_CALLS, DEFAULT_PROMPT_FILE, type AiConfig } from "../../constants/ai";
import { createLimiter } from "../../utils/limiter";
import { commentsOfQuestion } from "../crawler/comments-file.service";
import { askClaude, type ClaudeContent } from "./claude.client";
import { loadImageForAi } from "./image";

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
      description: "Exactly one entry per question provided, using the question numbers from the image labels.",
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
export function validateOutput(out: ClaudeOutput, numbers: number[], display: (n: number) => number = (n) => n): SolveResult {
  const byNumber = new Map<number, ClaudeAnswer>();
  for (const a of out.answers ?? []) {
    if (byNumber.has(a.question)) throw new Error(`Claude trả lặp câu ${a.question}`);
    byNumber.set(a.question, a);
  }
  const missing = numbers.filter((n) => !byNumber.has(n));
  if (missing.length) throw new Error(`Claude thiếu đáp án ở câu ${missing.map(display).join(", ")}`);

  const answers: string[] = [];
  const bad: number[] = [];
  const unsure: number[] = [];
  for (const n of numbers) {
    const a = byNumber.get(n)!;
    const choice = a.choice.toUpperCase().replace(/[.,;]+/g, " ").replace(/\s+/g, " ").trim();
    if (!CHOICE.test(choice)) bad.push(display(n));
    if (a.confidence === "unsure") unsure.push(display(n));
    answers.push(choice);
  }
  if (bad.length) throw new Error(`Claude trả đáp án không phải chữ cái ở câu ${bad.join(", ")} (chưa chấm được)`);

  const note = unsure.length ? `\n\n[System] Claude marked these questions as unsure: ${unsure.join(", ")}.` : "";
  return { answers, report: `${out.report.trim()}${note}` };
}

// Dùng chung cho mọi đề đang giải: giới hạn tổng số lần gọi Claude cùng lúc
const callLimit = createLimiter(AI_MAX_PARALLEL_CALLS);

interface BatchItem {
  label: number; // số câu ghi trên nhãn ảnh gửi cho Claude
  name: string; // tên ảnh, dùng để tìm bình luận của câu
  file: string;
}

/** Một lượt giải cho một nhóm câu: gửi ảnh + bình luận của đúng các câu đó, đọc lại đáp án theo cấu trúc cố định. */
async function solveBatch(config: AiConfig, title: string, items: BatchItem[], commentsText: string | null, display: (n: number) => number): Promise<SolveResult> {
  const n = items.length;
  // Chỉ gửi bình luận của các câu trong nhóm: ít token hơn và Claude không bị phân tâm bởi câu khác
  const sections = items.map((it) => commentsOfQuestion(commentsText, it.name) && `## ${it.name}
${commentsOfQuestion(commentsText, it.name)}`).filter(Boolean);
  const batchComments = sections.length ? sections.join("\n\n") : null;

  const content: ClaudeContent[] = [
    { type: "text", text: `<exam>
Title: ${title || "(unknown)"}
Number of questions (N): ${n}
</exam>` },
  ];
  for (const it of items) {
    const image = await loadImageForAi(it.file);
    content.push({ type: "text", text: `Question ${it.label} (file ${path.basename(it.file)}):` });
    content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
  }
  content.push({
    type: "text",
    text: batchComments
      ? `<comments>
${batchComments}
</comments>

Solve all ${n} questions following your instructions.`
      : `There are no forum comments for these questions, so solve everything yourself.

Solve all ${n} questions following your instructions.`,
  });

  const system = await loadPrompt();
  // Lỗi định dạng (thiếu/trùng câu) thử lại một lần; lỗi mạng/API đã được SDK tự thử lại
  for (let attempt = 1; ; attempt++) {
    const out = (await callLimit(() =>
      askClaude({ apiKey: config.anthropicApiKey, model: config.claudeModel, effort: config.effort, system, content, schema: OUTPUT_SCHEMA, useSearch: config.useSearch }),
    )) as ClaudeOutput;
    try {
      return validateOutput(out, items.map((it) => it.label), display);
    } catch (err) {
      if (attempt >= 2) throw err;
    }
  }
}

/**
 * Giải cả đề. Đề ngắn: một lần gọi. Đề dài: chia thành các lô cân bằng (tối đa AI_BATCH_SIZE câu) gọi song song,
 * mỗi lô đánh số lại từ 1 trong lời nhắc; kết quả ghép lại đúng thứ tự câu.
 */
export async function solveExam(config: AiConfig, input: SolveInput): Promise<SolveResult> {
  if (!config.anthropicApiKey) throw new Error("Chưa cấu hình khóa Anthropic");
  const n = input.questions.length;
  if (n === 0) throw new Error("Đề không có câu nào");

  if (n <= AI_BATCH_SIZE) {
    return solveBatch(config, input.title, input.questions.map((q) => ({ label: q.number, name: q.name, file: q.file })), input.commentsText, (x) => x);
  }

  const parts = Math.ceil(n / AI_BATCH_SIZE);
  const size = Math.ceil(n / parts);
  const jobs = Array.from({ length: parts }, (_, p) => {
    const slice = input.questions.slice(p * size, (p + 1) * size);
    const offset = p * size;
    const items = slice.map((q, i) => ({ label: i + 1, name: q.name, file: q.file }));
    return { slice, offset, run: () => solveBatch(config, input.title, items, input.commentsText, (x) => x + offset) };
  });

  // Chờ cả lô dừng hẳn rồi mới báo lỗi (không để lại lời gọi nào chạy mồ côi); một lô lỗi là cả đề lỗi
  const settled = await Promise.allSettled(jobs.map((j) => j.run()));
  const failed = settled.find((r): r is PromiseRejectedResult => r.status === "rejected");
  if (failed) throw failed.reason;

  const results = settled.map((r) => (r as PromiseFulfilledResult<SolveResult>).value);
  const report = results
    .map((r, p) => {
      const { slice, offset } = jobs[p]!;
      const header = `[Part ${p + 1}/${parts}: exam questions ${slice[0]!.number}-${slice[slice.length - 1]!.number}; question numbers below are numbered 1-${slice.length} within this part, so exam question = number + ${offset}]`;
      return `${header}
${r.report}`;
    })
    .join("\n\n");
  return { answers: results.flatMap((r) => r.answers), report };
}
