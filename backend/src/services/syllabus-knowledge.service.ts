import { prisma } from "../configs/prisma";
import { EMBEDDING_MODEL } from "../constants/chat";
import { buildSyllabusChunks, type SyllabusSubject } from "../utils/syllabus-chunks";
import { toBytes } from "../utils/vector";
import { embedDocuments } from "./ai/embedding.client";
import { chatSettingService } from "./chat-setting.service";
import { syllabusRagService } from "./syllabus-rag.service";

const BATCH = 100; // số đoạn mỗi lần gọi OpenAI
const MAX_RETRIES = 6;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));


async function embedWithRetry(key: string, texts: string[]) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await embedDocuments(key, texts);
    } catch (err) {
      const msg = (err as Error).message;
      if (!/giới hạn tốc độ/i.test(msg) || attempt >= MAX_RETRIES) throw err; // chỉ thử lại khi bị giới hạn tốc độ (hết tiền thì thử lại vô ích)
      await sleep(Math.min(60_000, 5_000 * 2 ** attempt)); // bị giới hạn tốc độ: chờ lâu dần rồi thử lại
    }
  }
}

export interface IndexResult {
  subjects: number;
  chunks: number;
  added: number;
  changed: number;
  removed: number;
  embedded: number;
  pending: number; // đoạn còn chưa có vector
  chars: number;
}

export const syllabusKnowledgeService = {
  /**
   * Nhập nội dung Syllabus (từ file JSON của tiện ích FLM, có trường `details`) thành các đoạn và, nếu `embed`, tạo vector cho đoạn mới hoặc đã đổi.
   * Chạy lại an toàn: đoạn không đổi giữ nguyên vector (so theo hash nội dung); đoạn của môn có trong file mà không còn nữa thì bị xoá.
   * Ghi vector sau từng lô nên bị ngắt giữa chừng thì chạy lại sẽ làm tiếp.
   */
  async index(subjects: SyllabusSubject[], opts: { embed: boolean; dryRun?: boolean; onProgress?: (done: number, total: number) => void }): Promise<IndexResult> {
    const wanted = subjects.flatMap((s) => buildSyllabusChunks(s));
    const codes = [...new Set(subjects.map((s) => s.code.trim().toUpperCase()))];
    const existing = new Map((await prisma.subjectChunk.findMany({ where: { subjectCode: { in: codes } }, select: { slug: true, contentHash: true, model: true, embedding: true } })).map((r) => [r.slug, r]));
    const wantedSlugs = new Set(wanted.map((c) => c.slug));
    const stale = [...existing.keys()].filter((slug) => !wantedSlugs.has(slug));
    const added = wanted.filter((c) => !existing.has(c.slug));
    const changed = wanted.filter((c) => existing.has(c.slug) && existing.get(c.slug)!.contentHash !== c.hash);
    const result: IndexResult = { subjects: codes.length, chunks: wanted.length, added: added.length, changed: changed.length, removed: stale.length, embedded: 0, pending: 0, chars: wanted.reduce((n, c) => n + c.content.length, 0) };
    if (opts.dryRun) {
      result.pending = wanted.filter((c) => !existing.has(c.slug) || existing.get(c.slug)!.contentHash !== c.hash || existing.get(c.slug)!.embedding == null || existing.get(c.slug)!.model !== EMBEDDING_MODEL).length;
      return result;
    }

    for (const c of [...added, ...changed]) {
      const base = { subjectCode: c.slug.split(":")[0]!, kind: c.kind, title: c.title, content: c.content, contentHash: c.hash };
      await prisma.subjectChunk.upsert({ where: { slug: c.slug }, create: { slug: c.slug, ...base }, update: { ...base, embedding: null, model: null } }); // nội dung đổi: vector cũ không còn đúng
    }
    if (stale.length) await prisma.subjectChunk.deleteMany({ where: { slug: { in: stale } } });

    const { openaiApiKey } = await chatSettingService.get();
    const todo = (await prisma.subjectChunk.findMany({ where: { subjectCode: { in: codes }, OR: [{ embedding: null }, { model: { not: EMBEDDING_MODEL } }] }, select: { id: true, title: true, content: true } })).sort((a, b) => a.id - b.id);
    result.pending = todo.length;
    if (opts.embed && openaiApiKey) {
      for (let i = 0; i < todo.length; i += BATCH) {
        const batch = todo.slice(i, i + BATCH);
        const vectors = await embedWithRetry(openaiApiKey, batch.map((c) => c.content));
        for (const [j, c] of batch.entries()) await prisma.subjectChunk.update({ where: { id: c.id }, data: { embedding: toBytes(vectors[j]!), model: EMBEDDING_MODEL } });
        result.embedded += batch.length;
        result.pending -= batch.length;
        opts.onProgress?.(result.embedded, todo.length);
      }
    }
    syllabusRagService.invalidate(); // chỉ mục tìm kiếm của chatbot nạp lại từ DB ở lần hỏi kế tiếp
    return result;
  },
};
