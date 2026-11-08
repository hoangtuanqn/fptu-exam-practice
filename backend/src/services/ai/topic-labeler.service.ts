import path from "node:path";
import { prisma } from "../../configs/prisma";
import { storageDir } from "../../configs/env";
import { aiReady } from "../../constants/ai";
import { subjectCodeOf } from "../../prompts";
import { createLimiter } from "../../utils/limiter";
import { buildTopicItems, type TopicItem } from "../../utils/topic-items";
import { aiSettingService } from "../ai-setting.service";
import { askClaude, type ClaudeContent } from "./claude.client";
import { loadImageForAi } from "./image";

// Mỗi lần gửi chừng này ảnh: đủ nhỏ để nhanh và rẻ, đủ lớn để không tốn nhiều lượt gọi
const BATCH = 12;
const limit = createLimiter(2); // gắn nhãn là việc phụ: chỉ chiếm tối đa 2 lượt gọi cùng lúc

// Prompt tĩnh (được cache). Danh sách chủ đề theo từng môn nằm trong phần nội dung của mỗi lượt gọi.
const SYSTEM = `You classify exam questions by topic for a university course.
You receive a numbered list of topics for the course, then several images, each one a multiple-choice exam question.
For every image choose the single topic from the list that the question tests most directly, and answer with that topic's number.
Use 0 only when the image is not a question (for example a formula sheet or cover page) or when no topic in the list is even loosely related.
Judge by what the question asks, not by wording like "Which of the following". Identify each image only by its question number.`;

const SCHEMA = {
  type: "object",
  properties: {
    labels: {
      type: "array",
      description: "Exactly one entry for every image provided, with no gaps and no duplicates.",
      items: {
        type: "object",
        properties: {
          question: { type: "integer", description: "Number from the image label." },
          topic: { type: "integer", description: "Number of the chosen topic from the list, or 0 when none applies." },
        },
        required: ["question", "topic"],
        additionalProperties: false,
      },
    },
  },
  required: ["labels"],
  additionalProperties: false,
};

// Tiêu đề kiểu "MAD101_SP26_FE": dấu gạch dưới là ký tự chữ nên subjectCodeOf (dùng \b) không nhận ra mã
const codeWithUnderscore = (title: string) => title.match(/(?<![A-Za-z0-9])[A-Za-z]{2,4}\d{3}[A-Za-z]?(?![A-Za-z0-9])/)?.[0].toUpperCase() ?? null;

export interface LabelResult {
  examId: number;
  title: string;
  subject: string | null;
  skipped?: string; // lý do không gắn nhãn (không có môn, môn không có chủ đề, AI chưa bật...)
  labels: { number: number; topic: string | null }[];
}

interface LabelOptions {
  save?: boolean; // false = chỉ trả kết quả để xem thử, không ghi DB
  force?: boolean; // true = gắn lại cả câu đã có nhãn
  max?: number; // chỉ gắn tối đa chừng này câu (dùng khi chạy thử)
}

async function askBatch(model: { apiKey: string; model: string }, items: TopicItem[], batch: { number: number; file: string }[], subjectName: string) {
  const list = items.map((t) => `${t.id}. ${t.label}${t.hint ? ` (${t.hint})` : ""}`).join("\n");
  const content: ClaudeContent[] = [{ type: "text", text: `Course: ${subjectName}\n\n<topics>\n${list}\n</topics>\n\nClassify these ${batch.length} questions.` }];
  for (const q of batch) {
    const image = await loadImageForAi(q.file);
    content.push({ type: "text", text: `Question ${q.number}:` });
    content.push({ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } });
  }
  const out = (await limit(() =>
    askClaude({ apiKey: model.apiKey, model: model.model, effort: "low", system: SYSTEM, content, schema: SCHEMA, useSearch: false, maxTokens: 4_000 }),
  )) as { labels?: { question: number; topic: number }[] };
  return out.labels ?? [];
}

export const topicLabelerService = {
  /** Gắn chủ đề cho các câu của một đề, dựa trên chương/mục của syllabus môn học (bảng subjects). */
  async labelExam(examId: number, opts: LabelOptions = {}): Promise<LabelResult> {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: {
        title: true,
        questions: { where: { isReference: false }, orderBy: { number: "asc" }, select: { number: true, imagePath: true, topic: true } },
      },
    });
    const base: LabelResult = { examId, title: exam?.title ?? "", subject: null, labels: [] };
    if (!exam) return { ...base, skipped: "không thấy đề" };

    const code = subjectCodeOf(exam.title) ?? codeWithUnderscore(exam.title);
    // Mã trong tiêu đề có thể thiếu/thừa chữ cuối (SWE201 và SWE201c): thử khớp đúng, rồi khớp theo phần số
    const subject = code
      ? ((await prisma.subject.findUnique({ where: { code }, include: { chapters: { orderBy: { number: "asc" } } } })) ??
        (await prisma.subject.findFirst({ where: { code: { startsWith: code.replace(/[A-Z]$/, "") } }, include: { chapters: { orderBy: { number: "asc" } } } })))
      : null;
    if (!subject) return { ...base, skipped: code ? `môn ${code} chưa có trong bảng subjects` : "không nhận ra mã môn trong tiêu đề" };
    base.subject = subject.code;

    const items = buildTopicItems(subject.chapters.map((c) => ({ number: c.number, title: c.title, topics: (c.topics as string[]) ?? [] })));
    if (items.length < 2) return { ...base, skipped: "môn chưa đủ dữ liệu chủ đề" };

    const ai = await aiSettingService.get();
    if (!aiReady(ai)) return { ...base, skipped: "AI chưa bật" };

    let todo = exam.questions.filter((q) => opts.force || !q.topic);
    if (opts.max) todo = todo.slice(0, opts.max);
    if (todo.length === 0) return { ...base, skipped: "các câu đã có nhãn" };

    const byId = new Map(items.map((t) => [t.id, t.label]));
    const result = new Map<number, string | null>();
    const batches: (typeof todo)[] = [];
    for (let i = 0; i < todo.length; i += BATCH) batches.push(todo.slice(i, i + BATCH));
    await Promise.all(
      batches.map(async (b) => {
        const labels = await askBatch(
          { apiKey: ai.anthropicApiKey, model: ai.claudeModel },
          items,
          b.map((q) => ({ number: q.number, file: path.join(storageDir, q.imagePath) })),
          subject.name,
        );
        for (const l of labels) {
          if (!b.some((q) => q.number === l.question) || result.has(l.question)) continue;
          result.set(l.question, byId.get(l.topic) ?? null); // 0 hoặc số lạ = không gắn
        }
      }),
    );

    if (opts.save !== false) {
      const byTopic = new Map<string, number[]>();
      for (const [number, topic] of result) if (topic) byTopic.set(topic, [...(byTopic.get(topic) ?? []), number]);
      for (const [topic, numbers] of byTopic) await prisma.examQuestion.updateMany({ where: { examId, number: { in: numbers } }, data: { topic } });
    }
    return { ...base, labels: todo.map((q) => ({ number: q.number, topic: result.get(q.number) ?? null })) };
  },
};
