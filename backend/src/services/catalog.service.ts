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

// Kho đề theo môn: chỉ các đề đã có trong hệ thống (đủ ảnh, không đang chờ AI).
// Mỗi đề có một trạng thái: "owned" (đã trong kho của bạn) hoặc "ready" (mở ngay). "fetch" giữ trong kiểu cho giao diện cũ, không còn trả về.
// Chỉ trả thông tin mô tả (tên, ngày, số câu); ảnh câu hỏi chỉ xem được sau khi mở đề.

const CACHE_MS = 5 * 60 * 1000;
const MY_SUBJECTS_MAX = 10;

interface UsableExam {
  id: string;
  threadId: string;
  title: string;
  questions: number;
  createdAt: Date;
  postedAt: Date | null;
  code: string | null;
  kind: ExamKind | null;
}

export type CatalogStatus = "owned" | "ready" | "fetch";

export interface CatalogItem {
  examId: string | null; // ID đề trong hệ thống (dùng trong địa chỉ /exam/:id); luôn có giá trị, kiểu giữ null cho giao diện cũ
  threadId: string;
  title: string;
  postedAt: Date | null;
  replies: number; // luôn 0, giữ trường cho giao diện cũ
  term: string | null; // kỳ học suy ra từ tên đề, ví dụ SU26 (chỉ theo tên đề)
  status: CatalogStatus;
  questions: number | null; // chỉ biết với đề hệ thống đã có
  kind: ExamKind; // FE, PE, QUIZ, OTHER
}

let examCache: { at: number; exams: UsableExam[] } | null = null;
// Tăng mỗi lần bỏ đệm: lượt đọc bắt đầu trước khi bỏ đệm thì không được ghi đè đệm bằng dữ liệu cũ
let generation = 0;

// Mọi đề đã lấy đủ ảnh và không đang chờ AI (xem CATALOG_ANSWER_SOURCES)
async function usableExams(): Promise<UsableExam[]> {
  if (examCache && Date.now() - examCache.at < CACHE_MS) return examCache.exams;
  const gen = generation;
  const [exams, counts, withFiles] = await Promise.all([
    prisma.exam.findMany({ where: { answerSource: { in: CATALOG_ANSWER_SOURCES } }, select: { id: true, threadId: true, title: true, subjectCode: true, totalQuestions: true, createdAt: true, postedAt: true, kind: true } }),
    prisma.examQuestion.groupBy({ by: ["examId", "isReference"], _count: { _all: true } }),
    prisma.examAttachment.groupBy({ by: ["examId"] }),
  ]);
  const filesOnly = new Set(withFiles.map((f) => f.examId)); // đề tài nguyên: không có câu hỏi, chỉ có tệp
  const all = new Map<string, number>(); // tất cả ảnh đã lưu (gồm tài liệu tham khảo): so với totalQuestions để biết đã lấy đủ chưa
  const real = new Map<string, number>(); // số câu hỏi thật
  for (const c of counts) {
    all.set(c.examId, (all.get(c.examId) ?? 0) + c._count._all);
    if (!c.isReference) real.set(c.examId, c._count._all);
  }
  const list = exams
    .filter((e) => ((real.get(e.id) ?? 0) > 0 && (all.get(e.id) ?? 0) >= e.totalQuestions) || (e.totalQuestions === 0 && filesOnly.has(e.id)))
    .map((e) => ({ id: e.id, threadId: e.threadId, title: e.title, questions: real.get(e.id) ?? 0, createdAt: e.createdAt, postedAt: e.postedAt, code: subjectOfExam(e), kind: e.kind }));
  if (gen === generation) examCache = { at: Date.now(), exams: list };
  return list;
}

/** Bỏ đệm của Kho đề (gọi sau khi admin tải/cập nhật đề) để đề mới hiện ngay, không đợi hết CACHE_MS. */
export function invalidateCatalogCache() {
  generation++;
  examCache = latestCache = overviewCache = null;
}

const LATEST_COUNT = 6;
let latestCache: { at: number; items: LatestItem[] } | null = null;

export interface LatestItem {
  examId: string; // mới: mở thẳng /exam/:id
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
  examsKnown: number; // tổng đề (giữ trường cho giao diện cũ, bằng examsReady)
  examsReady: number; // đề hệ thống đã có ảnh + đáp án, mở ngay
  bySemester: { semester: number | null; subjects: number; examsKnown: number; examsReady: number }[]; // kỳ 0-9 rồi "chưa phân loại" (null)
  byKind: Record<ExamKind, number>; // số đề theo loại (đề có mã môn)
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

  /** Các đề mới nhất trong hệ thống (mọi môn, ngày đăng hoặc ngày thêm), để trang chủ cho thấy kho đề luôn được cập nhật. Chỉ có mô tả, không có ảnh. */
  async latest(): Promise<LatestItem[]> {
    if (latestCache && Date.now() - latestCache.at < CACHE_MS) return latestCache.items;
    const gen = generation;
    const items = (await usableExams())
      .filter((e): e is UsableExam & { code: string } => !!e.code)
      .map((e) => ({ examId: e.id, threadId: e.threadId, subjectCode: e.code, title: e.title, postedAt: e.postedAt ?? e.createdAt, term: termOf(e.title), kind: e.kind ?? "FE" }))
      .sort((a, b) => b.postedAt.getTime() - a.postedAt.getTime())
      .slice(0, LATEST_COUNT);
    if (gen === generation) latestCache = { at: Date.now(), items };
    return items;
  },

  /** Các môn có đề: số đề đã có trong hệ thống (total = ready, giữ cả hai trường cho giao diện cũ). */
  async subjects() {
    const [exams, subjects] = await Promise.all([usableExams(), prisma.subject.findMany({ select: { code: true, name: true, semester: true } })]);
    const names = new Map(subjects.map((s) => [s.code, s.name]));
    const semesters = new Map(subjects.map((s) => [s.code, s.semester]));
    const ready = new Map<string, number>();
    for (const e of exams) if (e.code) ready.set(e.code, (ready.get(e.code) ?? 0) + 1);
    return [...ready.entries()]
      .map(([code, n]) => ({ code, name: names.get(code) ?? null, total: n, ready: n, semester: semesters.get(code) ?? null }))
      .sort((a, b) => b.total - a.total || a.code.localeCompare(b.code));
  },

  /** Số liệu thật cho trang Thư viện đề thi: tổng môn/đề và phân theo kỳ học (0-9, rồi chưa phân loại). Đệm vài phút. */
  async overview(): Promise<LibraryOverview> {
    if (overviewCache && Date.now() - overviewCache.at < CACHE_MS) return overviewCache.data;
    const gen = generation;
    const [rows, exams] = await Promise.all([this.subjects(), usableExams()]);
    const byKind = Object.fromEntries(EXAM_KINDS.map((k) => [k, 0])) as Record<ExamKind, number>;
    // Cùng quy tắc với examsKnown (chỉ đề có mã môn) và với các tab của exams() (đề cũ chưa có loại = FE)
    for (const e of exams) if (e.code) byKind[e.kind ?? "FE"]++;
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

  /** Đề của một môn trong hệ thống, lọc theo loại, từ khoá và kỳ, mới nhất trước, phân trang. */
  async exams(code: string, query: PaginationQuery & { q?: string; term?: string; kind?: ExamKind }, userId: string | null) {
    const subject = code.toUpperCase();
    const ours = (await usableExams()).filter((e) => e.code === subject);
    const mine = userId && ours.length ? new Set((await prisma.userExam.findMany({ where: { userId, examId: { in: ours.map((e) => e.id) } }, select: { examId: true } })).map((o) => o.examId)) : new Set<string>();
    // Đề cũ chưa có loại (trước khi điền lúc khởi động) coi là FE
    const everything: CatalogItem[] = ours.map((e) => ({ examId: e.id, threadId: e.threadId, title: e.title, postedAt: e.postedAt, replies: 0, term: termOf(e.title), status: mine.has(e.id) ? "owned" : "ready", questions: e.questions, kind: e.kind ?? "FE" }));
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
      price: cfg.fetchPrice, // phí mở một đề chưa có trong kho của bạn, để hiện trên nút mở đề
      pePrice: PE_PRICE, // đề PE có giá riêng
      subject: { code: subject, name: info?.name ?? null, semester: info?.semester ?? null },
    };
  },
};
