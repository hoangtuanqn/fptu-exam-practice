import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { parseSiteTime } from "../utils/html";

export interface NewExam {
  threadId: string;
  title: string;
  sourceUrl: string;
  author?: string;
  postedAt?: string;
  createdById: number;
  questions: {
    number: number;
    name: string;
    imagePath: string;
    sourceImage: string;
    mediaUrl?: string;
    answer: string;
    comments: { externalId: string; author: string; authorScore?: string; time: string; text: string; url: string }[];
  }[];
}

export const examRepository = {
  findByThreadId: (threadId: string) => prisma.exam.findUnique({ where: { threadId } }),

  findDetail: (id: number) =>
    prisma.exam.findUnique({
      where: { id },
      include: { questions: { orderBy: { number: "asc" }, select: { number: true, imagePath: true, answer: true } } },
    }),

  // Đề + câu hỏi + bình luận được ghi trong một transaction: hoặc đủ, hoặc không có gì
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
          },
        });

        for (const q of data.questions) {
          const question = await tx.examQuestion.create({
            data: {
              examId: exam.id,
              number: q.number,
              name: q.name,
              imagePath: q.imagePath,
              sourceImage: q.sourceImage,
              mediaUrl: q.mediaUrl,
              answer: q.answer,
            },
          });
          if (q.comments.length) {
            await tx.examComment.createMany({
              data: q.comments.map((c) => ({
                questionId: question.id,
                externalId: c.externalId,
                author: c.author,
                authorScore: c.authorScore,
                postedAt: parseSiteTime(c.time),
                text: c.text,
                url: c.url,
              })),
            });
          }
        }
        return exam;
      },
      { timeout: 60_000 },
    ),
};

// Hai lượt nhập cùng một thread chạy gần nhau: lượt đến sau chạm unique `thread_id`
export const isDuplicateThread = (err: unknown) =>
  err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
