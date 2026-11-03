import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { parseSiteTime } from "../utils/html";
import { toSkipTake, type PaginationQuery } from "../utils/pagination";

// PENDING = AI đang phân tích đáp án (đề đã dùng được, chỉ chưa chấm được)
export type AnswerSource = "PENDING" | "DEFAULT" | "AI" | "MANUAL";

export interface NewExam {
  threadId: string;
  title: string;
  sourceUrl: string;
  author?: string;
  postedAt?: string;
  createdById?: number;
  answerSource: AnswerSource;
  aiReport?: string;
  questions: {
    number: number;
    name: string;
    imagePath: string;
    sourceImage: string;
    mediaUrl?: string;
    answer: string;
  }[];
}

export const examRepository = {
  findByThreadId: (threadId: string) => prisma.exam.findUnique({ where: { threadId } }),

  // Đáp án đúng của từng câu, dùng để chấm bài
  findQuestionsForGrading: (examId: number) =>
    prisma.examQuestion.findMany({ where: { examId }, orderBy: { number: "asc" }, select: { number: true, answer: true } }),

  findDetail: (id: number) =>
    prisma.exam.findUnique({
      where: { id },
      include: { questions: { orderBy: { number: "asc" }, select: { number: true, imagePath: true, answer: true } } },
    }),

  // Dữ liệu để nhờ AI giải lại: tên + đường dẫn ảnh từng câu
  findForSolve: (id: number) =>
    prisma.exam.findUnique({
      where: { id },
      include: { questions: { orderBy: { number: "asc" }, select: { number: true, name: true, imagePath: true } } },
    }),

  // Trạng thái đáp án và đáp án từng câu, để giao diện hỏi lại khi AI đang phân tích
  findAnswers: (id: number) =>
    prisma.exam.findUnique({
      where: { id },
      select: { answerSource: true, questions: { orderBy: { number: "asc" }, select: { number: true, answer: true } } },
    }),

  findAnswerSource: (id: number) => prisma.exam.findUnique({ where: { id }, select: { answerSource: true } }),

  // Đề còn đang chờ AI (ví dụ server tắt giữa chừng): xếp lại hàng khi khởi động
  findPendingIds: async () => (await prisma.exam.findMany({ where: { answerSource: "PENDING" }, select: { id: true } })).map((e) => e.id),

  findByThreadIdOfId: (id: number) => prisma.exam.findUnique({ where: { id }, select: { id: true } }),

  findReport: (id: number) =>
    prisma.exam.findUnique({ where: { id }, select: { id: true, title: true, threadId: true, answerSource: true, aiReport: true } }),

  async listAll(query: PaginationQuery) {
    const [items, total] = await Promise.all([
      prisma.exam.findMany({
        select: { id: true, title: true, threadId: true, totalQuestions: true, answerSource: true, createdAt: true },
        orderBy: { id: "desc" },
        ...toSkipTake(query),
      }),
      prisma.exam.count(),
    ]);
    return { items, total };
  },

  // Đề + câu hỏi được ghi trong một transaction: hoặc đủ, hoặc không có gì. (Bình luận lưu ở file comments.txt, không lưu DB)
  create: (data: NewExam) =>
    prisma.$transaction(
      async (tx) => {
        const exam = await tx.exam.create({
          data: {
            threadId: data.threadId,
            title: data.title,
            sourceUrl: data.sourceUrl,
            author: data.author,
            postedAt: parseSiteTime(data.postedAt),
            totalQuestions: data.questions.length,
            createdById: data.createdById,
            answerSource: data.answerSource,
            aiReport: data.aiReport,
          },
        });
        await tx.examQuestion.createMany({ data: data.questions.map((q) => ({ ...q, examId: exam.id })) });
        return exam;
      },
      { timeout: 60_000 },
    ),

  // Cập nhật đáp án cả đề (sau khi AI giải lại): chạy trong một transaction
  updateAnswers: (examId: number, answers: string[], source: AnswerSource, report: string | null) =>
    prisma.$transaction(async (tx) => {
      for (const [i, answer] of answers.entries()) {
        await tx.examQuestion.updateMany({ where: { examId, number: i + 1 }, data: { answer } });
      }
      await tx.exam.update({ where: { id: examId }, data: { answerSource: source, aiReport: report } });
    }),
};

// Hai lượt nhập cùng một thread chạy gần nhau: lượt đến sau chạm unique `thread_id`
export const isDuplicateThread = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
