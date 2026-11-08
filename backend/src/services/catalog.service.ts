import { prisma } from "../configs/prisma";
import { toMeta, type PaginationQuery } from "../utils/pagination";
import { subjectCodeFromTitle } from "../utils/subject-code";

// Kho đề theo môn: gộp danh mục đề FE trên FuOverflow (bảng fuo_threads, nhập từ tools/fuo-crawler) với các đề hệ thống đã có sẵn.
// Mỗi đề có một trạng thái: "owned" (đã trong kho của bạn), "ready" (hệ thống đã có ảnh + đáp án, mở ngay), "fetch" (chưa lấy: lấy từ FuOverflow, có thể mất phí).
// Chỉ trả thông tin mô tả (tên, ngày, số câu); ảnh câu hỏi chỉ xem được sau khi lấy đề.

const CACHE_MS = 5 * 60 * 1000;
const MY_SUBJECTS_MAX = 10;

interface UsableExam {
  id: number;
  threadId: string;
  title: string;
  questions: number;
  createdAt: Date;
  code: string | null;
}

export type CatalogStatus = "owned" | "ready" | "fetch";

export interface CatalogItem {
  threadId: string;
  title: string;
  postedAt: Date | null;
  replies: number;
  term: string | null; // kỳ học suy ra từ tên đề, ví dụ SU26
  status: CatalogStatus;
  questions: number | null; // chỉ biết với đề hệ thống đã có
}

let examCache: { at: number; exams: UsableExam[] } | null = null;
let fuoCache: { at: number; threads: { threadId: string; subjectCode: string }[] } | null = null;

// Mọi đề dùng được ngay: đã có đáp án (AI hoặc chỉnh tay) và đã lấy đủ ảnh
async function usableExams(): Promise<UsableExam[]> {
  if (examCache && Date.now() - examCache.at < CACHE_MS) return examCache.exams;
  const [exams, counts] = await Promise.all([
    prisma.exam.findMany({ where: { answerSource: { in: ["AI", "MANUAL"] } }, select: { id: true, threadId: true, title: true, totalQuestions: true, createdAt: true } }),
    prisma.examQuestion.groupBy({ by: ["examId", "isReference"], _count: { _all: true } }),
  ]);
  const all = new Map<number, number>(); // tất cả ảnh đã lưu (gồm tài liệu tham khảo): so với totalQuestions để biết đã lấy đủ chưa
  const real = new Map<number, number>(); // số câu hỏi thật
  for (const c of counts) {
    all.set(c.examId, (all.get(c.examId) ?? 0) + c._count._all);
    if (!c.isReference) real.set(c.examId, c._count._all);
  }
  const list = exams
    .filter((e) => (real.get(e.id) ?? 0) > 0 && (all.get(e.id) ?? 0) >= e.totalQuestions)
    .map((e) => ({ id: e.id, threadId: e.threadId, title: e.title, questions: real.get(e.id) ?? 0, createdAt: e.createdAt, code: subjectCodeFromTitle(e.title) }));
  examCache = { at: Date.now(), exams: list };
  return list;
}

// Toàn bộ (thread, môn) của danh mục FuOverflow, chỉ hai cột nên nhẹ; dùng để đếm số đề mỗi môn
async function fuoThreads() {
  if (fuoCache && Date.now() - fuoCache.at < CACHE_MS) return fuoCache.threads;
  const threads = await prisma.fuoThread.findMany({ select: { threadId: true, subjectCode: true } });
  fuoCache = { at: Date.now(), threads };
  return threads;
}

const TERM = /(?<![A-Za-z0-9])(SP|SU|FA)\s?-?\s?(\d{2})(?![0-9])/i;
export const termOf = (title: string) => {
  const m = title.match(TERM);
  return m ? `${m[1]!.toUpperCase()}${m[2]}` : null;
};
// Kỳ mới hơn xếp trước: năm lớn hơn, cùng năm thì FA (cuối năm) > SU > SP
const termRank = (t: string) => Number(t.slice(2)) * 10 + ({ FA: 3, SU: 2, SP: 1 }[t.slice(0, 2)] ?? 0);

export const catalogService = {
  /** Các môn có đề: tổng số đề (FuOverflow + hệ thống) và số đề hệ thống đã có sẵn. */
  async subjects() {
    const [exams, fuo, subjects] = await Promise.all([usableExams(), fuoThreads(), prisma.subject.findMany({ select: { code: true, name: true } })]);
    const names = new Map(subjects.map((s) => [s.code, s.name]));
    const ids = new Map<string, Set<string>>(); // môn -> các thread (hợp của FuOverflow và hệ thống)
    const ready = new Map<string, number>();
    for (const t of fuo) (ids.get(t.subjectCode) ?? ids.set(t.subjectCode, new Set()).get(t.subjectCode)!).add(t.threadId);
    for (const e of exams) {
      if (!e.code) continue;
      (ids.get(e.code) ?? ids.set(e.code, new Set()).get(e.code)!).add(e.threadId);
      ready.set(e.code, (ready.get(e.code) ?? 0) + 1);
    }
    return [...ids.entries()]
      .map(([code, set]) => ({ code, name: names.get(code) ?? null, total: set.size, ready: ready.get(code) ?? 0 }))
      .sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
  },

  /** Các môn người dùng đã lấy đề (mới nhất trước), để bấm nhanh. */
  async mySubjects(userId: number) {
    const rows = await prisma.userExam.findMany({ where: { userId }, orderBy: { id: "desc" }, take: 300, select: { exam: { select: { title: true } } } });
    const codes: string[] = [];
    for (const r of rows) {
      const code = subjectCodeFromTitle(r.exam.title);
      if (code && !codes.includes(code)) codes.push(code);
      if (codes.length >= MY_SUBJECTS_MAX) break;
    }
    return codes;
  },

  /** Đề của một môn: gộp danh mục FuOverflow với đề hệ thống, lọc theo từ khoá và kỳ, mới nhất trước, phân trang. */
  async exams(code: string, query: PaginationQuery & { q?: string; term?: string }, userId: number | null) {
    const subject = code.toUpperCase();
    const [fuo, ours] = await Promise.all([
      prisma.fuoThread.findMany({ where: { subjectCode: subject }, select: { threadId: true, title: true, postedAt: true, replies: true } }),
      usableExams().then((list) => list.filter((e) => e.code === subject)),
    ]);
    const mine = userId && ours.length ? new Set((await prisma.userExam.findMany({ where: { userId, examId: { in: ours.map((e) => e.id) } }, select: { examId: true } })).map((o) => o.examId)) : new Set<number>();
    const have = new Map(ours.map((e) => [e.threadId, e]));

    const merged = new Map<string, CatalogItem>();
    for (const t of fuo) merged.set(t.threadId, { threadId: t.threadId, title: t.title, postedAt: t.postedAt, replies: t.replies, term: termOf(t.title), status: "fetch", questions: null });
    for (const e of ours) {
      const base = merged.get(e.threadId) ?? { threadId: e.threadId, title: e.title, postedAt: null, replies: 0, term: termOf(e.title), status: "fetch" as CatalogStatus, questions: null };
      merged.set(e.threadId, base);
    }
    for (const item of merged.values()) {
      const e = have.get(item.threadId);
      if (e) {
        item.status = mine.has(e.id) ? "owned" : "ready";
        item.questions = e.questions;
      }
    }

    const all = [...merged.values()];
    const terms = new Map<string, number>();
    for (const i of all) if (i.term) terms.set(i.term, (terms.get(i.term) ?? 0) + 1);
    const termList = [...terms.entries()].sort((a, b) => termRank(b[0]) - termRank(a[0])).map(([term, count]) => ({ term, count }));

    const needle = query.q?.trim().toLowerCase();
    const filtered = all
      .filter((i) => (!needle || i.title.toLowerCase().includes(needle)) && (!query.term || i.term === query.term))
      // Kỳ mới trước; cùng kỳ thì bài đăng sau trước (thread ID tăng theo thời gian nên dùng được cả cho đề không có ngày đăng)
      .sort((a, b) => (b.term ? termRank(b.term) : 0) - (a.term ? termRank(a.term) : 0) || (BigInt(b.threadId) > BigInt(a.threadId) ? 1 : -1));

    const start = (query.page - 1) * query.limit;
    return { items: filtered.slice(start, start + query.limit), meta: toMeta(query, filtered.length), terms: termList, total: all.length };
  },
};
