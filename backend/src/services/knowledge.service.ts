import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { EMBEDDING_MODEL, KNOWLEDGE_DIR, KNOWLEDGE_FILE, RETRIEVE_MIN_SCORE, RETRIEVE_SCORE_BAND, RETRIEVE_TOP_K } from "../constants/chat";
import { embedDocuments, embedQuery } from "./ai/embedding.client";
import { chatSettingService } from "./chat-setting.service";

export interface Chunk {
  slug: string;
  title: string;
  content: string;
  hash: string;
  embedding: number[] | null;
}

export interface Hit {
  title: string;
  content: string;
  score: number;
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");

/** Tách tài liệu markdown thành các đoạn theo mục "## " (bỏ phần mở đầu trước mục đầu tiên). */
export function splitSections(markdown: string): { title: string; content: string }[] {
  const out: { title: string; content: string }[] = [];
  let cur: { title: string; lines: string[] } | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      if (cur) out.push({ title: cur.title, content: cur.lines.join("\n").trim() });
      cur = { title: m[1]!, lines: [] };
    } else if (cur) cur.lines.push(line);
  }
  if (cur) out.push({ title: cur.title, content: cur.lines.join("\n").trim() });
  return out.filter((s) => s.content.length > 0);
}

// ---- Từ khoá (dự phòng khi chưa có khoá Gemini hoặc Gemini lỗi): bỏ dấu, tách từ, đếm từ trùng
const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
const STOP = new Set(["la", "va", "co", "the", "cua", "cho", "toi", "minh", "ban", "nao", "gi", "nhu", "khong", "duoc", "o", "de", "mot", "nay", "thi", "bi", "se", "thay", "vao"]);
const tokens = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOP.has(t));

function keywordHits(query: string, chunks: Chunk[]): Hit[] {
  const q = [...new Set(tokens(query))];
  if (q.length === 0) return [];
  return chunks
    .map((c) => {
      const title = new Set(tokens(c.title));
      const body = new Set(tokens(c.content));
      const score = q.reduce((s, t) => s + (title.has(t) ? 3 : 0) + (body.has(t) ? 1 : 0), 0) / (q.length * 2);
      return { title: c.title, content: c.content, score };
    })
    .filter((h) => h.score >= 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, RETRIEVE_TOP_K);
}

// Vector đã chuẩn hoá nên cosine = tích vô hướng
export const dot = (a: number[], b: number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
};

// ---- Bộ nhớ đệm: vài chục đoạn, nạp từ DB một lần
let cache: Chunk[] | null = null;
const queryCache = new Map<string, number[]>(); // câu hỏi giống hệt không gọi Gemini lại
const QUERY_CACHE_MAX = 300;

async function chunks(): Promise<Chunk[]> {
  if (cache) return cache;
  const rows = await prisma.kbChunk.findMany({ orderBy: { id: "asc" } });
  cache = rows.map((r) => ({ slug: r.slug, title: r.title, content: r.content, hash: r.contentHash, embedding: Array.isArray(r.embedding) ? (r.embedding as number[]) : null }));
  return cache;
}

/** Vector (đã chuẩn hoá) của câu hỏi; dùng chung bộ nhớ đệm với tìm kiếm nên không gọi Gemini hai lần. null nếu chưa có khoá hoặc Gemini lỗi. */
async function queryVector(query: string): Promise<number[] | null> {
  const { geminiApiKey } = await chatSettingService.get();
  if (!geminiApiKey) return null;
  let q = queryCache.get(query);
  if (!q) {
    try {
      q = await embedQuery(geminiApiKey, query);
    } catch {
      return null;
    }
    if (queryCache.size >= QUERY_CACHE_MAX) queryCache.delete(queryCache.keys().next().value!);
    queryCache.set(query, q);
  }
  return q;
}

export const knowledgeService = {
  queryVector,

  /** Dấu vân tay của toàn bộ tài liệu hướng dẫn: đổi nội dung thì đổi, bấm cập nhật mà không có gì mới thì giữ nguyên. */
  async version() {
    const all = await chunks();
    return sha(all.map((c) => `${c.slug}:${c.hash}`).join("|"));
  },

  async stats() {
    const all = await chunks();
    return { chunks: all.length, embedded: all.filter((c) => c.embedding).length, model: EMBEDDING_MODEL };
  },

  /**
   * Đọc tài liệu, tạo embedding cho đoạn mới hoặc đã đổi nội dung, xoá đoạn không còn. Chưa có khoá Gemini thì vẫn lưu đoạn
   * (không có vector) để chatbot tìm bằng từ khoá.
   */
  async reindex(): Promise<{ total: number; updated: number; embedded: number; warning?: string }> {
    const markdown = await fs.readFile(path.join(KNOWLEDGE_DIR, KNOWLEDGE_FILE), "utf-8");
    const sections = splitSections(markdown).map((s) => ({ ...s, slug: sha(s.title).slice(0, 16), hash: sha(`${s.title}\n${s.content}`) }));
    const existing = new Map((await prisma.kbChunk.findMany({ select: { slug: true, contentHash: true, embedding: true, model: true } })).map((r) => [r.slug, r]));

    const { geminiApiKey } = await chatSettingService.get();
    // Cần (tạo lại) vector khi: đoạn mới, nội dung đổi, hoặc chưa có vector/đổi model và hiện đã có khoá
    const todo = sections.filter((s) => {
      const old = existing.get(s.slug);
      return !old || old.contentHash !== s.hash || (geminiApiKey && (old.embedding == null || old.model !== EMBEDDING_MODEL));
    });

    let vectors: number[][] | null = null;
    let warning: string | undefined;
    if (todo.length > 0 && geminiApiKey) {
      try {
        vectors = await embedDocuments(geminiApiKey, todo.map((s) => `${s.title}\n${s.content}`));
      } catch (err) {
        warning = `Không tạo được embedding: ${(err as Error).message}. Chatbot sẽ tìm bằng từ khoá.`;
      }
    } else if (todo.length > 0) warning = "Chưa có khoá Gemini nên chưa tạo embedding; chatbot tìm bằng từ khoá.";

    for (const [i, s] of todo.entries()) {
      const vec = vectors?.[i] ?? null;
      const changed = existing.get(s.slug)?.contentHash !== s.hash;
      const base = { title: s.title, content: s.content, contentHash: s.hash };
      // Có vector mới thì ghi; nội dung đổi mà chưa có vector mới thì xoá vector cũ (đã lỗi thời); còn lại giữ nguyên
      const vector = vec ? { embedding: vec, model: EMBEDDING_MODEL } : changed ? { embedding: Prisma.DbNull, model: null } : {};
      await prisma.kbChunk.upsert({ where: { slug: s.slug }, update: { ...base, ...vector }, create: { slug: s.slug, ...base, ...(vec ? { embedding: vec, model: EMBEDDING_MODEL } : {}) } });
    }
    await prisma.kbChunk.deleteMany({ where: { slug: { notIn: sections.map((s) => s.slug) } } });

    cache = null;
    queryCache.clear();
    const stats = await this.stats();
    return { total: stats.chunks, updated: todo.length, embedded: stats.embedded, warning };
  },

  /** Các đoạn hướng dẫn gần nghĩa nhất với câu hỏi (embedding), hoặc theo từ khoá nếu không dùng được embedding. */
  async search(query: string): Promise<Hit[]> {
    const all = await chunks();
    if (all.length === 0) return [];
    const { geminiApiKey } = await chatSettingService.get();
    if (geminiApiKey && all.some((c) => c.embedding)) {
      try {
        const q = await queryVector(query);
        if (!q) throw new Error("không tạo được embedding");
        const hits = all
          .filter((c) => c.embedding)
          .map((c) => ({ title: c.title, content: c.content, score: dot(q, c.embedding!) }))
          .filter((h) => h.score >= RETRIEVE_MIN_SCORE)
          .sort((a, b) => b.score - a.score)
          .filter((h, _i, all) => h.score >= all[0]!.score - RETRIEVE_SCORE_BAND) // bỏ các đoạn kém liên quan so với đoạn tốt nhất
          .slice(0, RETRIEVE_TOP_K);
        if (hits.length > 0) return hits;
      } catch (err) {
        console.error(`[chat] embedding lỗi, chuyển sang tìm từ khoá: ${(err as Error).message}`);
      }
    }
    return keywordHits(query, all);
  },
};
