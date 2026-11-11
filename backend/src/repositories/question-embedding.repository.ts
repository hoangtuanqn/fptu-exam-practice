import { prisma } from "../configs/prisma";
import { USABLE_ANSWER_SOURCES } from "../constants/exam";

// Câu hỏi thuộc một môn = câu không phải tài liệu tham khảo của đề dùng được có subjectCode = mã môn
const subjectQuestions = (subjectCode: string) => ({ isReference: false, exam: { subjectCode, answerSource: { in: [...USABLE_ANSWER_SOURCES] } } });

export const questionEmbeddingRepository = {
  /** Một lô câu của môn chưa có vector của model, id tăng dần sau `afterId` (con trỏ để đi tiếp, không lặp lại câu bị bỏ qua). */
  missingBatch: (subjectCode: string, modelName: string, afterId: number, take: number) =>
    prisma.examQuestion.findMany({
      where: { ...subjectQuestions(subjectCode), id: { gt: afterId }, embeddings: { none: { modelName } } },
      select: { id: true, imageHash: true },
      orderBy: { id: "asc" },
      take,
    }),

  /** Ghi một lô; câu đã có vector (chạy song song hoặc chạy lại) thì bỏ qua nhờ khoá unique. */
  insertMany: (rows: { questionId: number; modelName: string; dimensions: number; embedding: Uint8Array<ArrayBuffer> }[]) =>
    rows.length ? prisma.questionEmbedding.createMany({ data: rows, skipDuplicates: true }) : Promise.resolve({ count: 0 }),

  /** Mọi vector của môn cho một model, kèm đề/chương/số câu để gom nhóm và in cặp sát ngưỡng. */
  forSubject: (subjectCode: string, modelName: string) =>
    prisma.questionEmbedding.findMany({
      where: { modelName, question: subjectQuestions(subjectCode) },
      select: {
        questionId: true,
        dimensions: true,
        embedding: true,
        question: { select: { examId: true, number: true, topic: true, exam: { select: { title: true } } } },
      },
      orderBy: { questionId: "asc" },
    }),

  countSubjectQuestions: (subjectCode: string) => prisma.examQuestion.count({ where: subjectQuestions(subjectCode) }),
};
