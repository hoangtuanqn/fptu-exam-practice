import { CATALOG_ANSWER_SOURCES } from "../constants/exam";
import { PE_PRICE } from "../constants/pe";
import type { ExamKind } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { catalogOrder } from "../utils/catalog-order";
import { foldText } from "../utils/search-text";
import { EXAM_KINDS } from "../utils/exam-kind";
import { toMeta, type PaginationQuery } from "../utils/pagination";
import { subjectCodeFromTitle, subjectOfExam } from "../utils/subject-code";
import { termOf, termRank } from "../utils/term";
import { crawlerSettingService } from "./crawler-setting.service";

// Kho đề theo môn: gộp danh mục FuOverflow (bảng fuo_threads: mọi bài FE, PE, Quiz, khác của từng môn, do lượt quét danh mục của admin ghi)
// với các đề hệ thống đã có sẵn.
// Mỗi đề có một trạng thái: "owned" (đã trong kho của bạn), "ready" (hệ thống đã có ảnh + đáp án, mở ngay), "fetch" (chưa lấy: lấy từ FuOverflow, có thể mất phí).
// Chỉ trả thông tin mô tả (tên, ngày, số câu); ảnh câu hỏi chỉ xem được sau khi lấy đề.

const CACHE_MS = 5 * 60 * 1000;
const MY_SUBJECTS_MAX = 10;

interface UsableExam {
  id: string;
  threadId: string;
  title: string;
  questions: number;
  createdAt: Date;
  code: string | null;
  kind: ExamKind | null;
}

export type CatalogStatus = "owned" | "ready" | "fetch";

export interface CatalogItem {
  examId: string | null; // ID đề trong hệ thống (dùng trong địa chỉ /exam/:id); null = chưa có, phải lấy về
  threadId: string;
  title: string;
  postedAt: Date | null;
  replies: number;
  term: string | null; // kỳ học suy ra từ tên đề, ví dụ SU26 (chỉ theo tên đề)
  status: CatalogStatus;
  questions: number | null; // chỉ biết với đề hệ thống đã có
  kind: ExamKind; // FE, PE, QUIZ, OTHER (theo nhãn FuOverflow, rồi tên đề)
}

let examCache: { at: number; exams: UsableExam[] } | null = null;
let fuoCache: { at: number; threads: { threadId: string; subjectCode: string }[] } | null = null;
// Tăng mỗi lần bỏ đệm: lượt đọc bắt đầu trước khi bỏ đệm thì không được ghi đè đệm bằng dữ liệu cũ
let generation = 0;
// Đề đã lưu nhưng chưa đủ ảnh (chưa có câu, hoặc thiếu ảnh so với số câu), nhóm theo môn: ẩn khỏi danh mục đến khi đủ ảnh
let noImageCache: { at: number; byCode: Map<string, Set<string>> } | null = null;

// Mọi đề đã lấy đủ ảnh và không đang chờ/lỗi AI (xem CATALOG_ANSWER_SOURCES)
async function usableExams(): Promise<UsableExam[]> {
  if (examCache && Date.now() - examCache.at < CACHE_MS) return examCache.exams;
  const gen = generation;
  const [exams, counts] = await Promise.all([
    prisma.exam.findMany({ where: { answerSource: { in: CATALOG_ANSWER_SOURCES } }, select: { id: true, threadId: true, title: true, subjectCode: true, totalQuestions: true, createdAt: true, kind: true } }),
    prisma.examQuestion.groupBy({ by: ["examId", "isReference"], _count: { _all: true } }),
  ]);
  const all = new Map<string, number>(); // tất cả ảnh đã lưu (gồm tài liệu tham khảo): so với totalQuestions để biết đã lấy đủ chưa
  const real = new Map<string, number>(); // số câu hỏi thật
  for (const c of counts) {
    all.set(c.examId, (all.get(c.examId) ?? 0) + c._count._all);
    if (!c.isReference) real.set(c.examId, c._count._all);
  }
  const list = exams
    .filter((e) => (real.get(e.id) ?? 0) > 0 && (all.get(e.id) ?? 0) >= e.totalQuestions)
    .map((e) => ({ id: e.id, threadId: e.threadId, title: e.title, questions: real.get(e.id) ?? 0, createdAt: e.createdAt, code: subjectOfExam(e), kind: e.kind }));
  if (gen === generation) examCache = { at: Date.now(), exams: list };
  return list;
}

// Đề chưa đủ ảnh (kể cả đề chỉ có tệp đính kèm), nhóm theo môn. Đề này không hiện trong danh mục cho đến khi đủ ảnh.
async function noImageThreads(): Promise<Map<string, Set<string>>> {
  if (noImageCache && Date.now() - noImageCache.at < CACHE_MS) return noImageCache.byCode;
  const gen = generation;
  const [exams, counts] = await Promise.all([
    prisma.exam.findMany({ select: { id: true, threadId: true, title: true, subjectCode: true, totalQuestions: true } }),
    prisma.examQuestion.groupBy({ by: ["examId", "isReference"], _count: { _all: true } }),
  ]);
  const all = new Map<string, number>();
  const real = new Map<string, number>();
  for (const c of counts) {
    all.set(c.examId, (all.get(c.examId) ?? 0) + c._count._all);
    if (!c.isReference) real.set(c.examId, c._count._all);
  }
  const byCode = new Map<string, Set<string>>();
  for (const e of exams) {
    const code = subjectOfExam(e);
    if (!e.threadId || !code || ((real.get(e.id) ?? 0) > 0 && (all.get(e.id) ?? 0) >= e.totalQuestions)) continue;
    byCode.set(code, (byCode.get(code) ?? new Set<string>()).add(e.threadId));
  }
  if (gen === generation) noImageCache = { at: Date.now(), byCode };
  return byCode;
}

// Toàn bộ (thread, môn) của danh mục FuOverflow, chỉ hai cột nên nhẹ; dùng để đếm số đề mỗi môn
async function fuoThreads() {
  if (fuoCache && Date.now() - fuoCache.at < CACHE_MS) return fuoCache.threads;
  const gen = generation;
  const threads = await prisma.fuoThread.findMany({ select: { threadId: true, subjectCode: true } });
  if (gen === generation) fuoCache = { at: Date.now(), threads };
  return threads;
}

/** Bỏ đệm của Kho đề (gọi sau khi admin tải/cập nhật đề) để đề mới hiện ngay, không đợi hết CACHE_MS. */
export function invalidateCatalogCache() {
  generation++;
  examCache = noImageCache = fuoCache = latestCache = overviewCache = null;
}


const LATEST_COUNT = 6;
let latestCache: { at: number; items: LatestItem[] } | null = null;

export interface LatestItem {
  threadId: string;
  subjectCode: string;
  title: string;
  postedAt: Date;
  term: string | null;
  kind: ExamKind;
}

let overviewCache: { at: number; data: LibraryOverview } | null = null;

export interface LibraryOverview {
  subjects: number; // số môn có đề (biết hoặc sẵn sàng)
  examsKnown: number; // tổng đề biết (danh mục FuOverflow + hệ thống)
  examsReady: number; // đề hệ thống đã có ảnh + đáp án, mở ngay
  bySemester: { semester: number | null; subjects: number; examsKnown: number; examsReady: number }[]; // kỳ 0-9 rồi "chưa phân loại" (null)
  byKind: Record<ExamKind, number>; // số đề (thread) theo loại: danh mục FuOverflow + đề hệ thống chưa có trong danh mục
}

export const catalogService = {
  /** Đề có tên khớp từ khoá (mọi môn, chỉ đề dùng được), cho ô tìm kiếm chung. Lấy từ đệm, không truy vấn lại. */
  async searchExams(q: string, limit: number) {
    const needle = foldText(q);
    return (await usableExams())
      .filter((e) => foldText(e.title).includes(needle))
      .slice(0, limit)
      .map((e) => ({ examId: e.id, title: e.title, subjectCode: e.code, questions: e.questions, kind: e.kind }));
  },

  /** Các đề mới đăng gần đây nhất trên FuOverflow (mọi môn), để trang chủ cho thấy kho đề luôn được cập nhật. Chỉ có mô tả, không có ảnh. */
  async latest(): Promise<LatestItem[]> {
    if (latestCache && Date.now() - latestCache.at < CACHE_MS) return latestCache.items;
    const gen = generation;
    const rows = await prisma.fuoThread.findMany({
      where: { postedAt: { not: null } },
      orderBy: { postedAt: "desc" },
      take: LATEST_COUNT,
      select: { threadId: true, subjectCode: true, title: true, postedAt: true, kind: true },
    });
    const items = rows.map((r) => ({ threadId: r.threadId, subjectCode: r.subjectCode, title: r.title, postedAt: r.postedAt!, term: termOf(r.title), kind: r.kind }));
    if (gen === generation) latestCache = { at: Date.now(), items };
    return items;
  },

  /** Các môn có đề: tổng số đề (FuOverflow + hệ thống) và số đề hệ thống đã có sẵn. */
  async subjects() {
    const [exams, fuo, subjects] = await Promise.all([usableExams(), fuoThreads(), prisma.subject.findMany({ select: { code: true, name: true, semester: true } })]);
    const names = new Map(subjects.map((s) => [s.code, s.name]));
    const semesters = new Map(subjects.map((s) => [s.code, s.semester]));
    const ids = new Map<string, Set<string>>(); // môn -> các thread (hợp của FuOverflow và hệ thống)
    const ready = new Map<string, number>();
    for (const t of fuo) (ids.get(t.subjectCode) ?? ids.set(t.subjectCode, new Set()).get(t.subjectCode)!).add(t.threadId);
    for (const e of exams) {
      if (!e.code) continue;
      (ids.get(e.code) ?? ids.set(e.code, new Set()).get(e.code)!).add(e.threadId);
      ready.set(e.code, (ready.get(e.code) ?? 0) + 1);
    }
    return [...ids.entries()]
      .map(([code, set]) => ({ code, name: names.get(code) ?? null, total: set.size, ready: ready.get(code) ?? 0, semester: semesters.get(code) ?? null }))
      .sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
  },

  /** Số liệu thật cho trang Thư viện đề thi: tổng môn/đề và phân theo kỳ học (0-9, rồi chưa phân loại). Đệm vài phút. */
  async overview(): Promise<LibraryOverview> {
    if (overviewCache && Date.now() - overviewCache.at < CACHE_MS) return overviewCache.data;
    const gen = generation;
    const [rows, fuo, exams, kindRows] = await Promise.all([
      this.subjects(),
      fuoThreads(),
      usableExams(),
      prisma.fuoThread.groupBy({ by: ["kind"], _count: { _all: true } }),
    ]);
    const byKind = Object.fromEntries(EXAM_KINDS.map((k) => [k, 0])) as Record<ExamKind, number>;
    for (const r of kindRows) byKind[r.kind] += r._count._all;
    const inFuo = new Set(fuo.map((t) => t.threadId));
    // Cùng quy tắc với examsKnown (chỉ đề có mã môn) và với các tab của exams() (đề cũ chưa có loại = FE)
    for (const e of exams) if (e.code && !inFuo.has(e.threadId)) byKind[e.kind ?? "FE"]++;
    const bucket = new Map<number | null, { semester: number | null; subjects: number; examsKnown: number; examsReady: number }>();
    for (let i = 0; i <= 9; i++) bucket.set(i, { semester: i, subjects: 0, examsKnown: 0, examsReady: 0 });
    bucket.set(null, { semester: null, subjects: 0, examsKnown: 0, examsReady: 0 });
    for (const r of rows) {
      const b = bucket.get(r.semester)!;
      b.subjects++;
      b.examsKnown += r.total;
      b.examsReady += r.ready;
    }
    const data: LibraryOverview = {
      subjects: rows.length,
      examsKnown: rows.reduce((n, r) => n + r.total, 0),
      examsReady: rows.reduce((n, r) => n + r.ready, 0),
      bySemester: [...bucket.values()],
      byKind,
    };
    if (gen === generation) overviewCache = { at: Date.now(), data };
    return data;
  },

  /** Các môn người dùng đã lấy đề (mới nhất trước), để bấm nhanh. */
  async mySubjects(userId: string) {
    const rows = await prisma.userExam.findMany({ where: { userId }, orderBy: { id: "desc" }, take: 300, select: { exam: { select: { title: true } } } });
    const codes: string[] = [];
    for (const r of rows) {
      const code = subjectCodeFromTitle(r.exam.title);
      if (code && !codes.includes(code)) codes.push(code);
      if (codes.length >= MY_SUBJECTS_MAX) break;
    }
    return codes;
  },

  /** Đề của một môn: gộp danh mục FuOverflow với đề hệ thống, lọc theo loại, từ khoá và kỳ, mới nhất trước, phân trang. */
  async exams(code: string, query: PaginationQuery & { q?: string; term?: string; kind?: ExamKind }, userId: string | null) {
    const subject = code.toUpperCase();
    const [fuo, ours, hidden] = await Promise.all([
      prisma.fuoThread.findMany({ where: { subjectCode: subject }, select: { threadId: true, title: true, postedAt: true, replies: true, kind: true } }),
      usableExams().then((list) => list.filter((e) => e.code === subject)),
      noImageThreads().then((m) => m.get(subject) ?? new Set<string>()), // đề chưa đủ ảnh: ẩn, không hiện như đề "chưa lấy"
    ]);
    const mine = userId && ours.length ? new Set((await prisma.userExam.findMany({ where: { userId, examId: { in: ours.map((e) => e.id) } }, select: { examId: true } })).map((o) => o.examId)) : new Set<string>();
    const have = new Map(ours.map((e) => [e.threadId, e]));

    const merged = new Map<string, CatalogItem>();
    for (const t of fuo) if (!hidden.has(t.threadId)) merged.set(t.threadId,{ examId: null, threadId: t.threadId, title: t.title, postedAt: t.postedAt, replies: t.replies, term: termOf(t.title), status: "fetch", questions: null, kind: t.kind });
    for (const e of ours) {
      // Đề cũ chưa có loại (trước khi điền lúc khởi động) đều được lấy qua nhãn "Đề Thi FE"
      const base = merged.get(e.threadId) ?? { examId: null, threadId: e.threadId, title: e.title, postedAt: null, replies: 0, term: termOf(e.title), status: "fetch" as CatalogStatus, questions: null, kind: e.kind ?? "FE" };
      merged.set(e.threadId, base);
    }
    for (const item of merged.values()) {
      const e = have.get(item.threadId);
      if (e) {
        item.examId = e.id;
        item.status = mine.has(e.id) ? "owned" : "ready";
        item.questions = e.questions;
      }
    }

    const everything = [...merged.values()];
    const kinds = Object.fromEntries(EXAM_KINDS.map((k) => [k, 0])) as Record<ExamKind, number>;
    for (const i of everything) kinds[i.kind]++;
    const all = query.kind ? everything.filter((i) => i.kind === query.kind) : everything; // số kỳ và trang theo loại đang lọc
    const terms = new Map<string, number>();
    for (const i of all) if (i.term) terms.set(i.term, (terms.get(i.term) ?? 0) + 1);
    const termList = [...terms.entries()].sort((a, b) => termRank(b[0]) - termRank(a[0])).map(([term, count]) => ({ term, count }));

    const needle = query.q?.trim().toLowerCase();
    const filtered = all
      .filter((i) => (!needle || i.title.toLowerCase().includes(needle)) && (!query.term || i.term === query.term))
      .sort(catalogOrder);

    const start = (query.page - 1) * query.limit;
    const [info, cfg] = await Promise.all([prisma.subject.findUnique({ where: { code: subject }, select: { name: true, semester: true } }), crawlerSettingService.get()]);
    return {
      items: filtered.slice(start, start + query.limit),
      meta: toMeta(query, filtered.length),
      terms: termList,
      total: everything.length,
      kinds, // số đề theo loại của cả môn (cho các tab lọc)
      price: cfg.fetchPrice, // phí lấy một đề chưa có trong kho của bạn, để hiện trên nút mở đề
      pePrice: PE_PRICE, // đề PE có giá riêng
      subject: { code: subject, name: info?.name ?? null, semester: info?.semester ?? null },
    };
  },
};
