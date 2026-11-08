import { prisma } from "../configs/prisma";
import { subjectCodeFromTitle } from "../utils/subject-code";

// Thư viện đề theo môn: các đề hệ thống đã có sẵn (đã lấy đủ ảnh và đã có đáp án), để người dùng chọn thẳng không cần đi tìm link FuOverflow.
// Chỉ trả thông tin mô tả (tên, số câu); ảnh câu hỏi chỉ xem được sau khi lấy đề (có thể mất phí như mọi lần lấy đề).

const CACHE_MS = 5 * 60 * 1000;
const MAX_EXAMS_PER_SUBJECT = 200;

interface CatalogExam {
  id: number;
  threadId: string;
  title: string;
  questions: number;
  createdAt: Date;
  code: string | null;
}

let cache: { at: number; exams: CatalogExam[] } | null = null;

// Mọi đề dùng được: đã có đáp án (AI hoặc chỉnh tay) và đã lấy đủ ảnh
async function usableExams(): Promise<CatalogExam[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.exams;
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
  cache = { at: Date.now(), exams: list };
  return list;
}

export const catalogService = {
  async subjects() {
    const [exams, subjects] = await Promise.all([usableExams(), prisma.subject.findMany({ select: { code: true, name: true } })]);
    const names = new Map(subjects.map((s) => [s.code, s.name]));
    const by = new Map<string, number>();
    for (const e of exams) if (e.code) by.set(e.code, (by.get(e.code) ?? 0) + 1);
    return [...by.entries()]
      .map(([code, count]) => ({ code, name: names.get(code) ?? null, exams: count }))
      .sort((a, b) => b.exams - a.exams || a.code.localeCompare(b.code));
  },

  async exams(code: string, userId: number | null) {
    const list = (await usableExams()).filter((e) => e.code === code.toUpperCase()).sort((a, b) => b.id - a.id).slice(0, MAX_EXAMS_PER_SUBJECT);
    const owned = userId && list.length ? new Set((await prisma.userExam.findMany({ where: { userId, examId: { in: list.map((e) => e.id) } }, select: { examId: true } })).map((o) => o.examId)) : new Set<number>();
    return list.map((e) => ({ threadId: e.threadId, title: e.title, questions: e.questions, createdAt: e.createdAt, owned: owned.has(e.id) }));
  },
};
