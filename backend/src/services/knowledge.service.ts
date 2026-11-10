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

// ---- Tìm đúng từ (BM25): bỏ dấu, tách từ, thêm cặp từ liền nhau để khớp cụm như "phó chủ nhiệm". Bổ sung cho embedding:
// embedding hiểu nghĩa nhưng hay trượt tên riêng, mã, chức danh; từ khoá thì ngược lại.
export const fold = (s: string) =>
  s
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
const STOP = new Set(["la", "va", "co", "the", "cua", "cho", "toi", "minh", "ban", "nao", "gi", "ai", "nhu", "khong", "duoc", "o", "de", "mot", "nay", "thi", "bi", "se", "thay", "vao", "ma", "hay", "nhe", "a", "oi", "voi", "can", "muon", "lam", "sao"]);
const words = (s: string) => fold(s).split(/[^a-z0-9]+/).filter((t) => t.length > 1 && !STOP.has(t));
/** Từ đơn + cặp từ liền nhau (khử trùng). */
export const terms = (s: string) => {
  const w = words(s);
  return [...w, ...w.slice(1).map((t, i) => `${w[i]!} ${t}`)];
};

interface KwIndex {
  tf: Map<string, number>[];
  len: number[];
  avg: number;
  df: Map<string, number>;
}
let kwIndex: KwIndex | null = null;
const BM25_K1 = 1.5;
const BM25_B = 0.75;
const KW_TITLE_WEIGHT = 3; // tiêu đề mục quan trọng hơn thân bài
const KW_MIN_COVERAGE = 0.6; // phần trọng số (idf) của các từ trong câu hỏi phải có mặt trong đoạn

function buildIndex(all: Chunk[]): KwIndex {
  const tf: Map<string, number>[] = [];
  const df = new Map<string, number>();
  const len: number[] = [];
  for (const c of all) {
    const m = new Map<string, number>();
    for (const t of terms(c.content)) m.set(t, (m.get(t) ?? 0) + 1);
    for (const t of terms(c.title)) m.set(t, (m.get(t) ?? 0) + KW_TITLE_WEIGHT);
    tf.push(m);
    len.push([...m.values()].reduce((x, y) => x + y, 0));
    for (const t of m.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  }
  return { tf, len, avg: len.reduce((x, y) => x + y, 0) / Math.max(1, len.length), df };
}

/** Các đoạn chứa đúng các từ của câu hỏi, xếp theo BM25; bỏ đoạn thiếu quá nhiều từ quan trọng. */
export function keywordHits(query: string, all: Chunk[], index: KwIndex = (kwIndex ??= buildIndex(all))): Hit[] {
  const q = [...new Set(terms(query))];
  if (q.length === 0) return [];
  const N = all.length;
  const idf = (t: string) => {
    const n = index.df.get(t) ?? 0;
    return Math.log(1 + (N - n + 0.5) / (n + 0.5)); // từ không có trong tài liệu nào vẫn tính (nặng nhất), để câu có từ lạ không bị khớp nhầm
  };
  const total = q.reduce((x, t) => x + idf(t), 0);
  return all
    .map((c, i) => {
      let bm = 0;
      let hit = 0;
      for (const t of q) {
        const f = index.tf[i]!.get(t);
        if (!f) continue;
        hit += idf(t);
        bm += idf(t) * ((f * (BM25_K1 + 1)) / (f + BM25_K1 * (1 - BM25_B + (BM25_B * index.len[i]!) / index.avg)));
      }
      return { title: c.title, content: c.content, score: bm, coverage: total > 0 ? hit / total : 0 };
    })
    .filter((h) => h.coverage >= KW_MIN_COVERAGE)
    .sort((a, b) => b.score - a.score)
    .slice(0, RETRIEVE_TOP_K);
}

/** Trộn hai danh sách đã xếp hạng bằng RRF: đoạn có mặt ở cả hai (hiểu nghĩa lẫn đúng từ) lên đầu. */
export function fuse(lists: Hit[][], k = 60): Hit[] {
  const score = new Map<string, { hit: Hit; s: number }>();
  for (const list of lists)
    list.forEach((h, rank) => {
      const e = score.get(h.title) ?? { hit: h, s: 0 };
      e.s += 1 / (k + rank + 1);
      score.set(h.title, e);
    });
  return [...score.values()].sort((a, b) => b.s - a.s).map((e) => e.hit);
}

// Vector đã chuẩn hoá nên cosine = tích vô hướng
export const dot = (a: number[], b: number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i]! * b[i]!;
  return s;
};

// ---- Bộ nhớ đệm: vài chục đoạn, nạp từ DB một lần
let cache: Chunk[] | null = null;
const queryCache = new Map<string, number[]>(); // câu hỏi giống hệt không gọi OpenAI lại
const QUERY_CACHE_MAX = 300;

async function chunks(): Promise<Chunk[]> {
  if (cache) return cache;
  const rows = await prisma.kbChunk.findMany({ orderBy: { id: "asc" } });
  // Chỉ dùng vector do mô hình hiện tại tạo: vector của mô hình khác không so sánh được nên bỏ qua (đoạn đó tìm bằng từ khoá cho tới khi được tạo lại)
  cache = rows.map((r) => ({ slug: r.slug, title: r.title, content: r.content, hash: r.contentHash, embedding: r.model === EMBEDDING_MODEL && Array.isArray(r.embedding) ? (r.embedding as number[]) : null }));
  return cache;
}

/** Vector (đã chuẩn hoá) của câu hỏi; dùng chung bộ nhớ đệm với tìm kiếm nên không gọi OpenAI hai lần. null nếu chưa có khoá hoặc OpenAI lỗi. */
async function queryVector(query: string): Promise<number[] | null> {
  const { openaiApiKey } = await chatSettingService.get();
  if (!openaiApiKey) return null;
  let q = queryCache.get(query);
  if (!q) {
    try {
      q = await embedQuery(openaiApiKey, query);
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
   * Đọc tài liệu, tạo embedding cho đoạn mới hoặc đã đổi nội dung, xoá đoạn không còn. Chưa có khoá OpenAI thì vẫn lưu đoạn
   * (không có vector) để chatbot tìm bằng từ khoá.
   */
  async reindex(): Promise<{ total: number; updated: number; embedded: number; warning?: string }> {
    const markdown = await fs.readFile(path.join(KNOWLEDGE_DIR, KNOWLEDGE_FILE), "utf-8");
    const sections = splitSections(markdown).map((s) => ({ ...s, slug: sha(s.title).slice(0, 16), hash: sha(`${s.title}\n${s.content}`) }));
    const existing = new Map((await prisma.kbChunk.findMany({ select: { slug: true, contentHash: true, embedding: true, model: true } })).map((r) => [r.slug, r]));

    const { openaiApiKey } = await chatSettingService.get();
    // Cần (tạo lại) vector khi: đoạn mới, nội dung đổi, hoặc chưa có vector/đổi model và hiện đã có khoá
    const todo = sections.filter((s) => {
      const old = existing.get(s.slug);
      return !old || old.contentHash !== s.hash || (openaiApiKey && (old.embedding == null || old.model !== EMBEDDING_MODEL));
    });

    let vectors: number[][] | null = null;
    let warning: string | undefined;
    if (todo.length > 0 && openaiApiKey) {
      try {
        vectors = await embedDocuments(openaiApiKey, todo.map((s) => `${s.title}\n${s.content}`));
      } catch (err) {
        warning = `Không tạo được embedding: ${(err as Error).message}. Chatbot sẽ tìm bằng từ khoá.`;
      }
    } else if (todo.length > 0) warning = "Chưa có khoá OpenAI nên chưa tạo embedding; chatbot tìm bằng từ khoá.";

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
    kwIndex = null;
    queryCache.clear();
    const stats = await this.stats();
    return { total: stats.chunks, updated: todo.length, embedded: stats.embedded, warning };
  },

  /**
   * Các đoạn hướng dẫn liên quan nhất, kết hợp hai cách: embedding (gần nghĩa) và BM25 (đúng từ), trộn bằng RRF.
   * Không có khoá OpenAI hoặc OpenAI lỗi thì chỉ dùng đúng từ.
   */
  async search(query: string): Promise<Hit[]> {
    const all = await chunks();
    if (all.length === 0) return [];
    const exact = keywordHits(query, all);
    let semantic: Hit[] = [];
    const { openaiApiKey } = await chatSettingService.get();
    if (openaiApiKey && all.some((c) => c.embedding)) {
      try {
        const q = await queryVector(query);
        if (!q) throw new Error("không tạo được embedding");
        semantic = all
          .filter((c) => c.embedding)
          .map((c) => ({ title: c.title, content: c.content, score: dot(q, c.embedding!) }))
          .filter((h) => h.score >= RETRIEVE_MIN_SCORE)
          .sort((a, b) => b.score - a.score)
          .filter((h, _i, all) => h.score >= all[0]!.score - RETRIEVE_SCORE_BAND) // bỏ các đoạn kém liên quan so với đoạn tốt nhất
          .slice(0, RETRIEVE_TOP_K);
      } catch (err) {
        console.error(`[chat] embedding lỗi, chỉ tìm đúng từ: ${(err as Error).message}`);
      }
    }
    return fuse([semantic, exact]).slice(0, RETRIEVE_TOP_K);
  },
};
