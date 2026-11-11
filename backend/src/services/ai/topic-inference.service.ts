import { createHash } from "node:crypto";
import { prisma } from "../../configs/prisma";
import { baseSubjectCode } from "../../utils/subject-code";
import type { TopicItem } from "../../utils/topic-items";
import { askClaude } from "./claude.client";

// Môn mà syllabus (crawl từ FLM) không có tên chương: để AI suy ra danh sách chương từ mô tả, mục tiêu và lịch học của chính syllabus đó.
// Kết quả lưu lại theo môn nên mọi đề của môn dùng chung một bộ chương; syllabus đổi thì tự suy lại.
const SYSTEM = `You build a chapter list for a university course whose syllabus has no chapter names.
You receive the course name and the syllabus text: description, learning outcomes, chapter or session outline, materials.
Infer the 5 to 12 main chapters a student would study, in the order the course teaches them. Base every chapter strictly on what the syllabus text says. Never add topics the syllabus does not mention.
Give each chapter a short title (at most 80 characters) written in the same language as the syllabus, and a hint listing 3 to 8 concrete sub-topics from the syllabus, separated by semicolons.
Skip administrative sessions: introduction to the course rules, labs, review, revision, progress tests, midterm, final exam, presentations, projects and assignments.
Chapters must not overlap, so that one exam question belongs to exactly one chapter.`;

const SCHEMA = {
  type: "object",
  properties: {
    chapters: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, hint: { type: "string" } },
        required: ["title", "hint"],
        additionalProperties: false,
      },
    },
  },
  required: ["chapters"],
  additionalProperties: false,
};

const KIND_ORDER = ["overview", "clo", "chapters", "sessions", "materials"];
const MAX_CHARS = 14_000;

type Stored = { label: string; hint: string };

// Văn bản syllabus của môn (có thể nằm ở mã biến thể: PRO192C và PRO192), ghép theo thứ tự quan trọng và cắt cho vừa
async function syllabusText(code: string) {
  const base = baseSubjectCode(code);
  const chunks = await prisma.subjectChunk.findMany({
    where: { subjectCode: { startsWith: base } },
    orderBy: { id: "asc" },
    select: { subjectCode: true, kind: true, title: true, content: true },
  });
  const related = chunks.filter((c) => baseSubjectCode(c.subjectCode) === base && KIND_ORDER.includes(c.kind));
  const own = related.filter((c) => c.subjectCode === code);
  const use = own.length ? own : related;
  use.sort((a, b) => KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
  return use
    .map((c) => `## ${c.title}\n${c.content}`)
    .join("\n\n")
    .slice(0, MAX_CHARS);
}

const toItems = (stored: Stored[]): TopicItem[] => stored.map((t, i) => ({ id: i + 1, label: t.label, hint: t.hint }));

export const topicInferenceService = {
  /** Danh sách chủ đề suy ra cho môn (rỗng nếu syllabus không có chữ nào hoặc AI không trả được). */
  async items(code: string, subjectName: string, ai: { apiKey: string; model: string }): Promise<TopicItem[]> {
    const text = await syllabusText(code);
    if (text.length < 200) return [];
    const hash = createHash("sha256").update(text).digest("hex");
    const saved = await prisma.subjectInferredTopic.findUnique({ where: { subjectCode: code } });
    if (saved && saved.sourceHash === hash) return toItems(saved.topics as unknown as Stored[]);

    const out = (await askClaude({
      apiKey: ai.apiKey,
      model: ai.model,
      effort: "medium",
      system: SYSTEM,
      content: [{ type: "text", text: `Course: ${subjectName} (${code})\n\n<syllabus>\n${text}\n</syllabus>\n\nList the chapters.` }],
      schema: SCHEMA,
      useSearch: false,
      maxTokens: 6_000,
    })) as { chapters?: { title: string; hint: string }[] };

    const seen = new Set<string>();
    const topics: Stored[] = [];
    for (const c of out.chapters ?? []) {
      const label = c.title.replace(/\s+/g, " ").trim().slice(0, 120);
      const key = label.toLowerCase();
      if (!label || seen.has(key)) continue;
      seen.add(key);
      topics.push({ label: `Chương ${topics.length + 1}: ${label}`.slice(0, 255), hint: c.hint.replace(/\s+/g, " ").trim().slice(0, 300) });
    }
    if (topics.length < 2) return [];
    await prisma.subjectInferredTopic.upsert({
      where: { subjectCode: code },
      create: { subjectCode: code, topics, sourceHash: hash, model: ai.model },
      update: { topics, sourceHash: hash, model: ai.model },
    });
    return toItems(topics);
  },
};
