import { prisma } from "../configs/prisma";
import { newestFirst, toSkipTake, type PaginationQuery } from "../utils/pagination";

const key = (userId: number, examId: number, questionNumber: number) => ({ userId_examId_questionNumber: { userId, examId, questionNumber } });

export const savedQuestionRepository = {
  questionExists: async (examId: number, number: number) =>
    !!(await prisma.examQuestion.findFirst({ where: { examId, number, isReference: false }, select: { id: true } })),

  isSaved: async (userId: number, examId: number, questionNumber: number) =>
    !!(await prisma.savedQuestion.findUnique({ where: key(userId, examId, questionNumber), select: { id: true } })),

  count: (userId: number) => prisma.savedQuestion.count({ where: { userId } }),

  // Đã có thì bỏ qua (lưu lại cùng câu không lỗi, kể cả hai yêu cầu song song)
  add: (userId: number, examId: number, questionNumber: number) =>
    prisma.savedQuestion.createMany({ data: [{ userId, examId, questionNumber }], skipDuplicates: true }),

  remove: (userId: number, examId: number, questionNumber: number) => prisma.savedQuestion.deleteMany({ where: { userId, examId, questionNumber } }),

  numbersOfExam: async (userId: number, examId: number) =>
    (await prisma.savedQuestion.findMany({ where: { userId, examId }, select: { questionNumber: true }, orderBy: { questionNumber: "asc" } })).map((r) => r.questionNumber),

  async list(userId: number, query: PaginationQuery & { subject?: string }) {
    const where = { userId, ...(query.subject && { exam: { subjectCode: query.subject } }) };
    const [rows, total] = await Promise.all([
      prisma.savedQuestion.findMany({
        where,
        select: {
          id: true,
          examId: true,
          questionNumber: true,
          createdAt: true,
          exam: { select: { title: true, threadId: true, subjectCode: true, answerSource: true } },
        },
        orderBy: [...newestFirst(true)],
        ...toSkipTake(query),
      }),
      prisma.savedQuestion.count({ where }),
    ]);
    return { rows, total };
  },

  // Ảnh, đáp án, chủ đề hiện tại của các câu trong một trang (một truy vấn theo unique (exam_id, number))
  async questionsOf(items: { examId: number; questionNumber: number }[]) {
    if (items.length === 0) return new Map<string, { imagePath: string; answer: string; topic: string | null }>();
    const rows = await prisma.examQuestion.findMany({
      where: { OR: items.map((i) => ({ examId: i.examId, number: i.questionNumber })) },
      select: { examId: true, number: true, imagePath: true, answer: true, topic: true },
    });
    return new Map(rows.map((q) => [`${q.examId}:${q.number}`, q]));
  },
};
