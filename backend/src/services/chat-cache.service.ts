import { createHash } from "node:crypto";
import { prisma } from "../configs/prisma";
import { CACHE_DEDUPE_SCORE, CACHE_MAX_ENTRIES, CACHE_MIN_SCORE, CACHE_TTL_MS, CHAT_ACCOUNT_HINT, CHAT_MONEY_HINT, CHAT_SYSTEM_PROMPT, EMBEDDING_MODEL } from "../constants/chat";
import { startOfVnDay } from "../utils/time";
import { dot, knowledgeService } from "./knowledge.service";

/**
 * Cache câu trả lời theo ngữ nghĩa: câu hỏi hướng dẫn chung đã được Claude trả lời rồi thì lần sau hỏi lại (cùng ý, khác chữ)
 * trả luôn câu trả lời cũ, không gọi Claude.
 *
 * Chỉ lưu/dùng khi câu hỏi:
 * - đứng riêng (chưa có lịch sử hội thoại): câu nối tiếp như "còn trên điện thoại?" có nghĩa phụ thuộc ngữ cảnh;
 * - không hỏi về dữ liệu của chính người dùng và không nhắc tiền/giá (giá có thể đổi, dữ liệu cá nhân thì mỗi người một khác).
 * Cache gắn với "phiên bản" của tài liệu + prompt: sửa tài liệu thì cache cũ tự hết hiệu lực. Khách và thành viên tách riêng.
 */

export type Viewer = "member" | "guest";

interface Entry {
  id: number;
  viewer: Viewer;
  vec: number[];
  answer: string;
  version: string;
  createdAt: number;
}

let entries: Entry[] | null = null;
const promptHash = createHash("sha256").update(CHAT_SYSTEM_PROMPT).digest("hex");

async function currentVersion() {
  // Cả mô hình embedding nằm trong dấu vân tay: vector câu hỏi của mô hình khác không so sánh được, nên cache cũ tự hết hiệu lực khi đổi mô hình
  return createHash("sha256").update(`${await knowledgeService.version()}${promptHash}${EMBEDDING_MODEL}`).digest("hex").slice(0, 16);
}

async function load(): Promise<Entry[]> {
  if (entries) return entries;
  const rows = await prisma.chatAnswerCache.findMany({ orderBy: { id: "asc" } });
  entries = rows
    .filter((r) => Array.isArray(r.embedding))
    .map((r) => ({ id: r.id, viewer: r.viewer as Viewer, vec: r.embedding as number[], answer: r.answer, version: r.version, createdAt: r.createdAt.getTime() }));
  return entries;
}

const best = (all: Entry[], vec: number[], viewer: Viewer, version: string) => {
  const now = Date.now();
  let top: { entry: Entry; score: number } | null = null;
  for (const e of all) {
    if (e.viewer !== viewer || e.version !== version || now - e.createdAt > CACHE_TTL_MS) continue;
    const score = dot(vec, e.vec);
    if (!top || score > top.score) top = { entry: e, score };
  }
  return top;
};

export const chatCacheService = {
  /** Câu hỏi này có đủ điều kiện dùng/lưu cache không (chưa xét nội dung câu hỏi có trùng cái nào chưa). */
  eligible(historyLength: number, question: string) {
    return historyLength === 1 && !CHAT_ACCOUNT_HINT.test(question) && !CHAT_MONEY_HINT.test(question);
  },

  /** Câu trả lời đã lưu cho câu hỏi cùng ý, hoặc null. */
  async find(vec: number[], viewer: Viewer): Promise<string | null> {
    try {
      const [all, version] = await Promise.all([load(), currentVersion()]);
      const top = best(all, vec, viewer, version);
      if (!top || top.score < CACHE_MIN_SCORE) return null;
      void prisma.chatAnswerCache.update({ where: { id: top.entry.id }, data: { hits: { increment: 1 } } }).catch(() => undefined);
      return top.entry.answer;
    } catch (err) {
      console.error(`[chat-cache] tra cache lỗi: ${(err as Error).message}`);
      return null;
    }
  },

  /** Lưu câu trả lời mới (lỗi thì bỏ qua, không ảnh hưởng người dùng). */
  async save(vec: number[], viewer: Viewer, question: string, answer: string) {
    try {
      const text = answer.trim();
      if (!text) return;
      const [all, version] = await Promise.all([load(), currentVersion()]);
      const dup = best(all, vec, viewer, version);
      if (dup && dup.score >= CACHE_DEDUPE_SCORE) return; // đã có câu gần như y hệt

      const row = await prisma.chatAnswerCache.create({ data: { viewer, question: question.slice(0, 500), embedding: vec, answer: text, version } });
      all.push({ id: row.id, viewer, vec, answer: text, version, createdAt: row.createdAt.getTime() });

      // Quá giới hạn thì bỏ các mục cũ nhất
      if (all.length > CACHE_MAX_ENTRIES) {
        const drop = all.splice(0, all.length - CACHE_MAX_ENTRIES);
        await prisma.chatAnswerCache.deleteMany({ where: { id: { in: drop.map((d) => d.id) } } });
      }
    } catch (err) {
      console.error(`[chat-cache] lưu cache lỗi: ${(err as Error).message}`);
    }
  },

  /** Xoá mục hết hạn hoặc thuộc phiên bản tài liệu cũ (gọi sau khi cập nhật tri thức). */
  async purgeStale() {
    const version = await currentVersion();
    await prisma.chatAnswerCache.deleteMany({ where: { OR: [{ version: { not: version } }, { createdAt: { lt: new Date(Date.now() - CACHE_TTL_MS) } }] } });
    entries = null;
  },

  async clear() {
    const { count } = await prisma.chatAnswerCache.deleteMany();
    entries = null;
    return count;
  },

  async stats() {
    const version = await currentVersion();
    const [entries, today, total] = await Promise.all([
      prisma.chatAnswerCache.count({ where: { version, createdAt: { gte: new Date(Date.now() - CACHE_TTL_MS) } } }),
      prisma.chatLog.count({ where: { cached: true, createdAt: { gte: startOfVnDay() } } }),
      prisma.chatLog.count({ where: { cached: true } }),
    ]);
    return { entries, today, total };
  },
};
