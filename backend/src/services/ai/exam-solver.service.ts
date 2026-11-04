import path from "node:path";
import { AI_BATCH_SIZE, AI_MAX_PARALLEL_CALLS, AI_MIN_SOLVED_RATIO, type AiConfig } from "../../constants/ai";
import { createLimiter } from "../../utils/limiter";
import { commentsOfQuestion } from "../crawler/comments-file.service";
import { buildSystem, resolveModuleKey, subjectCodeOf } from "../../prompts";
import { askClaude, type ClaudeContent, type UsageInfo } from "./claude.client";
import { tallyOfComments } from "./comment-tally";
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
  moduleKey?: string; // module prompt chọn tường minh (từ UI / metadata); bỏ trống thì nhận diện từ tiêu đề rồi tới _default
}

export interface SolveResult {
  answers: string[]; // đáp án từng câu theo đúng thứ tự, ví dụ ["A", "C D", ...]. Chuỗi rỗng = chưa có đáp án (không chấm câu đó)
  report: string; // báo cáo của AI kèm danh sách câu chưa chắc / chưa giải được
  unanswered: number[]; // số câu (trong đề) AI không trả được đáp án hợp lệ, kể cả sau khi thử lại
  notQuestions: number[]; // số câu là ảnh không phải câu hỏi (ví dụ trang công thức): bỏ trống, không chấm
}

type Confidence = "certain" | "likely" | "unsure";
type Kind = "question" | "not_question";
interface ClaudeAnswer {
  question: number;
  kind: Kind;
  choice: string;
  confidence: Confidence;
}
interface ClaudeOutput {
  report: string;
  answers: ClaudeAnswer[];
}

// Phần gọi bên ngoài tách ra để kiểm thử được mà không cần gọi Claude thật
export interface SolverDeps {
  ask: typeof askClaude;
  loadImage: typeof loadImageForAi;
  onUsage?: (label: string, usage: UsageInfo) => void; // mặc định ghi log token và cảnh báo khi prompt không được cache
}

// Theo dõi cache: prompt được cache thì lần gọi sau đọc lại với giá rẻ (cacheRead > 0)
const logUsage = (label: string, u: UsageInfo) => {
  const cached = u.cacheRead + u.cacheCreation > 0;
  console.log(`[ai] usage ${label}: in=${u.input} out=${u.output} cache_read=${u.cacheRead} cache_write=${u.cacheCreation}${cached ? "" : " (prompt chưa được cache: có thể dưới ngưỡng tối thiểu của model)"}`);
};
const DEFAULT_DEPS: SolverDeps = { ask: askClaude, loadImage: loadImageForAi, onUsage: logUsage };

const CHOICE = /^[A-Z](?: [A-Z])*$/;

// Cấu trúc kết quả bắt buộc (structured outputs): Claude luôn trả JSON đúng dạng này, không phải tự cắt chữ từ đoạn văn
const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    report: {
      type: "string",
      description:
        "Short plain-text review in English, a few lines per point, no filler: questions that expect several answers, questions that are not ordinary multiple choice, non-question images, answers where you disagreed with the comments and why, doubtful or faulty questions and why, anything you could not verify.",
    },
    answers: {
      type: "array",
      description: "Exactly one entry for every image provided, with no gaps and no duplicates.",
      items: {
        type: "object",
        properties: {
          question: { type: "integer", description: "Number from the image label. Identify an item only by this number." },
          kind: {
            type: "string",
            enum: ["question", "not_question"],
            description: "'not_question' for an image with no question to answer (a formula sheet, cover page, instructions). Such items are not graded.",
          },
          choice: {
            type: "string",
            description:
              "Uppercase letters using the letters shown in the image (they can go beyond D), separated by single spaces when several answers are required, for example 'C' or 'A C D'. Empty string for a not_question item.",
          },
          confidence: {
            type: "string",
            enum: ["certain", "likely", "unsure"],
            description: "'certain' when you solved it and nothing contradicts it, 'likely' when you are fairly sure, 'unsure' when you are choosing between options.",
          },
        },
        required: ["question", "kind", "choice", "confidence"],
        additionalProperties: false,
      },
    },
  },
  required: ["report", "answers"],
  additionalProperties: false,
};

interface Parsed {
  choice: string; // "" = ảnh này không phải câu hỏi
  confidence: Confidence;
}

/**
 * Đọc kết quả của Claude. KHÔNG ném lỗi vì một câu hỏng: câu thiếu, trùng hay không phải chữ cái chỉ bị bỏ qua
 * (câu trùng giữ lần đầu, câu lạ không có trong đề bị bỏ), để các câu còn lại vẫn dùng được. Câu nào không có trong
 * `byLabel` là câu chưa có đáp án hợp lệ và sẽ được thử lại riêng.
 */
export function parseOutput(out: ClaudeOutput, labels: number[]): Map<number, Parsed> {
  const wanted = new Set(labels);
  const byLabel = new Map<number, Parsed>();
  for (const a of out?.answers ?? []) {
    if (!wanted.has(a.question) || byLabel.has(a.question)) continue;
    if (a.kind === "not_question") {
      byLabel.set(a.question, { choice: "", confidence: a.confidence });
      continue;
    }
    const choice = String(a.choice ?? "").trim().toUpperCase().replace(/[.,;]+/g, " ").replace(/\s+/g, " ").trim();
    if (CHOICE.test(choice)) byLabel.set(a.question, { choice, confidence: a.confidence });
  }
  return byLabel;
}

// Dùng chung cho mọi đề đang giải: giới hạn tổng số lần gọi Claude cùng lúc
const callLimit = createLimiter(AI_MAX_PARALLEL_CALLS);

interface BatchItem {
  label: number; // số ghi trên nhãn ảnh gửi cho Claude (đánh số lại từ 1 trong mỗi lượt gọi)
  name: string; // tên ảnh, dùng để tìm bình luận của câu
  file: string;
}

interface Context {
  config: AiConfig;
  moduleKey: string;
  title: string;
  commentsText: string | null;
  deps: SolverDeps;
}

/** Một lần gọi Claude cho một nhóm ảnh: gửi ảnh + bình luận của đúng các câu đó, đọc lại theo cấu trúc cố định. */
async function askOnce(ctx: Context, items: BatchItem[]): Promise<ClaudeOutput> {
  const n = items.length;
  // Chỉ gửi bình luận của các câu trong nhóm: ít token hơn và Claude không bị phân tâm bởi câu khác
  const sections = items
    .map((it) => {
      const text = commentsOfQuestion(ctx.commentsText, it.name);
      if (!text) return null;
      const tally = tallyOfComments(text); // đếm đáp án trong bình luận bằng code (xác định), không bắt model tự đếm
      return `## ${it.name}${tally ? `\n[tally: ${tally}]` : ""}\n${text}`;
    })
    .filter(Boolean);
  const batchComments = sections.length ? sections.join("\n\n") : null;
  const subject = subjectCodeOf(ctx.title);

  const content: ClaudeContent[] = [
    {
      type: "text",
      text: `<exam>
Title: ${ctx.title || "(unknown)"}${subject ? `\nSubject code: ${subject}` : ""}
Number of images (N): ${n}
</exam>`,
    },
  ];
  for (const it of items) {
    const image = await ctx.deps.loadImage(it.file);
    content.push({ type: "text", text: `Question ${it.label} (file ${path.basename(it.file)}):` });
    content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
  }
  content.push({
    type: "text",
    text: batchComments
      ? `<comments>
${batchComments}
</comments>

Solve all ${n} items following your instructions.`
      : `There are no forum comments for these items, so solve everything yourself.

Solve all ${n} items following your instructions.`,
  });

  // System chỉ gồm nội dung tĩnh (base + module + khối tính năng) để cache; mọi thứ theo từng đề nằm trong `content` ở trên
  const system = buildSystem("solve", ctx.moduleKey, { webSearch: ctx.config.useSearch });
  // Lỗi mạng/API đã được SDK tự thử lại; lỗi còn lại ném ra để nơi gọi quyết định
  return (await callLimit(() =>
    ctx.deps.ask({
      apiKey: ctx.config.anthropicApiKey,
      model: ctx.config.claudeModel,
      effort: ctx.config.effort,
      system,
      content,
      schema: OUTPUT_SCHEMA,
      useSearch: ctx.config.useSearch,
      onUsage: (u) => ctx.deps.onUsage?.(`${ctx.moduleKey}/${n} ảnh`, u),
    }),
  )) as ClaudeOutput;
}

interface BatchResult {
  choices: string[]; // theo thứ tự `items`; "" = không có đáp án
  report: string;
  unanswered: number[]; // số câu (đã đổi sang số trong đề) không có đáp án hợp lệ
  notQuestions: number[];
  unsure: number[];
}

/**
 * Giải một nhóm câu. Câu nào Claude bỏ sót hay trả sai định dạng thì chỉ thử lại RIÊNG các câu đó một lần
 * (rẻ hơn gọi lại cả nhóm). Vẫn thiếu thì để trống, nhóm vẫn dùng được. Chỉ ném lỗi khi không có câu nào dùng được.
 */
async function solveBatch(ctx: Context, items: BatchItem[], display: (label: number) => number): Promise<BatchResult> {
  const first = await askOnce(ctx, items);
  const byLabel = parseOutput(first, items.map((it) => it.label));
  const reports = [first.report?.trim() ?? ""];

  const missing = items.filter((it) => !byLabel.has(it.label));
  if (missing.length > 0) {
    const retryItems = missing.map((it, i) => ({ ...it, label: i + 1 }));
    try {
      const second = await askOnce(ctx, retryItems);
      const got = parseOutput(second, retryItems.map((r) => r.label));
      retryItems.forEach((r, i) => {
        const a = got.get(r.label);
        if (a) byLabel.set(missing[i]!.label, a);
      });
      const note = second.report?.trim();
      if (note) reports.push(`[Retry for questions ${missing.map((m) => display(m.label)).join(", ")}; numbered 1-${retryItems.length} in this retry, in that order]\n${note}`);
    } catch (err) {
      // Đã có câu giải được thì bỏ qua lần thử lại hỏng và giữ kết quả một phần; chưa có câu nào thì đây là lỗi thật
      if (byLabel.size === 0) throw err;
    }
  }
  if (byLabel.size === 0) throw new Error("Claude không trả đáp án hợp lệ cho câu nào");

  const labelsWhere = (pick: (p: Parsed) => boolean) => items.filter((it) => byLabel.has(it.label) && pick(byLabel.get(it.label)!)).map((it) => display(it.label));
  return {
    choices: items.map((it) => byLabel.get(it.label)?.choice ?? ""),
    report: reports.filter(Boolean).join("\n\n"),
    unanswered: items.filter((it) => !byLabel.has(it.label)).map((it) => display(it.label)),
    notQuestions: labelsWhere((p) => p.choice === ""),
    unsure: labelsWhere((p) => p.choice !== "" && p.confidence === "unsure"),
  };
}

/**
 * Giải cả đề. Đề ngắn: một lần gọi. Đề dài: chia thành các lô cân bằng (tối đa AI_BATCH_SIZE câu) gọi song song,
 * mỗi lô đánh số lại từ 1 trong lời nhắc; kết quả ghép lại đúng thứ tự câu.
 *
 * Chịu lỗi từng phần: một câu hay một lô hỏng chỉ để trống các câu đó, KHÔNG làm hỏng cả đề. Chỉ báo lỗi khi
 * không giải được câu nào, hoặc giải được ít hơn AI_MIN_SOLVED_RATIO số câu cần giải (dấu hiệu lỗi hệ thống như
 * hết credit hay sai khóa, khi đó để đề ở trạng thái lỗi và cho thử lại).
 */
export async function solveExam(config: AiConfig, input: SolveInput, deps: SolverDeps = DEFAULT_DEPS): Promise<SolveResult> {
  if (!config.anthropicApiKey) throw new Error("Chưa cấu hình khóa Anthropic");
  const n = input.questions.length;
  if (n === 0) throw new Error("Đề không có câu nào");

  const ctx: Context = { config, moduleKey: resolveModuleKey("solve", { explicit: input.moduleKey, title: input.title }), title: input.title, commentsText: input.commentsText, deps };
  const parts = Math.ceil(n / AI_BATCH_SIZE);
  const size = Math.ceil(n / parts);
  const jobs = Array.from({ length: parts }, (_, p) => {
    const slice = input.questions.slice(p * size, (p + 1) * size);
    const items = slice.map((q, i) => ({ label: i + 1, name: q.name, file: q.file }));
    const display = (label: number) => slice[label - 1]?.number ?? label;
    return { slice, offset: p * size, run: () => solveBatch(ctx, items, display) };
  });

  // Chờ cả lô dừng hẳn rồi mới tổng hợp (không để lại lời gọi nào chạy mồ côi)
  const settled = await Promise.allSettled(jobs.map((j) => j.run()));

  const answers: string[] = [];
  const unanswered: number[] = [];
  const notQuestions: number[] = [];
  const unsure: number[] = [];
  const reports: string[] = [];
  let firstFailure: unknown = null;

  settled.forEach((r, p) => {
    const { slice, offset } = jobs[p]!;
    const header = parts > 1 ? `[Part ${p + 1}/${parts}: exam questions ${slice[0]!.number}-${slice[slice.length - 1]!.number}; question numbers below are numbered 1-${slice.length} within this part, so exam question = number + ${offset}]\n` : "";
    if (r.status === "fulfilled") {
      answers.push(...r.value.choices);
      unanswered.push(...r.value.unanswered);
      notQuestions.push(...r.value.notQuestions);
      unsure.push(...r.value.unsure);
      reports.push(`${header}${r.value.report}`.trim());
    } else {
      firstFailure ??= r.reason;
      answers.push(...slice.map(() => ""));
      unanswered.push(...slice.map((q) => q.number));
      reports.push(`${header}[System] This part could not be solved: ${(r.reason as Error)?.message ?? "unknown error"}`.trim());
    }
  });

  const solvable = n - notQuestions.length;
  const solved = answers.filter(Boolean).length;
  if (solved === 0 || solved < solvable * AI_MIN_SOLVED_RATIO) {
    const why = firstFailure ? `: ${(firstFailure as Error).message}` : "";
    throw new Error(`AI chỉ giải được ${solved}/${solvable} câu${why}`);
  }

  const list = (xs: number[]) => [...xs].sort((a, b) => a - b).join(", ");
  const notes = [
    notQuestions.length ? `[System] Not graded because they are not questions (for example a formula sheet): ${list(notQuestions)}.` : "",
    unanswered.length ? `[System] No usable answer was obtained for questions: ${list(unanswered)}. They are left blank and are not graded.` : "",
    unsure.length ? `[System] Claude marked these questions as unsure: ${list(unsure)}.` : "",
  ].filter(Boolean);

  return { answers, report: [...reports.filter(Boolean), ...notes].join("\n\n"), unanswered: [...unanswered].sort((a, b) => a - b), notQuestions: [...notQuestions].sort((a, b) => a - b) };
}
