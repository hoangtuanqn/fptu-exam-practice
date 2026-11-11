import { prisma } from "../configs/prisma";
import { USABLE_ANSWER_SOURCES } from "../constants/exam";
import type { ExamAggregate } from "../utils/similarity-job";
import { subjectQuestions } from "./question-embedding.repository";

// Truy vấn của việc chạy ban đêm (services/similarity-job.service)

export const similarityJobRepository = {
  /** Mỗi mã môn có đề dùng được: số đề, tổng id, lần tạo/làm mới gần nhất (một truy vấn GROUP BY theo chỉ mục subject_code, answer_source). */
  async usableExamAggregates(): Promise<Map<string, ExamAggregate>> {
    const rows = await prisma.exam.groupBy({
      by: ["subjectCode"],
      where: { subjectCode: { not: null }, answerSource: { in: [...USABLE_ANSWER_SOURCES] } },
      _count: { _all: true },
      _sum: { id: true },
      _max: { createdAt: true, refreshedAt: true },
    });
    const out = new Map<string, ExamAggregate>();
    for (const r of rows) {
      if (!r.subjectCode) continue;
      out.set(r.subjectCode, { count: r._count._all, idSum: r._sum.id ?? 0, maxCreatedAt: r._max.createdAt, maxRefreshedAt: r._max.refreshedAt });
    }
    return out;
  },

  runs: () => prisma.similarityJobRun.findMany({ select: { subjectId: true, examSignature: true, hashCursor: true } }),

  /** Câu của môn chưa có dấu vân tay, id sau `afterId`. */
  countMissingHashes: (subjectCode: string, afterId: number) => prisma.examQuestion.count({ where: { ...subjectQuestions(subjectCode), imageHash: null, id: { gt: afterId } } }),

  /** Câu của môn đã có dấu vân tay nhưng chưa có vector của model. */
  countUnembedded: (subjectCode: string, modelName: string) =>
    prisma.examQuestion.count({ where: { ...subjectQuestions(subjectCode), imageHash: { not: null }, embeddings: { none: { modelName } } } }),

  /** Lô câu chưa có dấu vân tay, id tăng dần sau `afterId`. */
  missingHashBatch: (subjectCode: string, afterId: number, take: number) =>
    prisma.examQuestion.findMany({
      where: { ...subjectQuestions(subjectCode), imageHash: null, id: { gt: afterId } },
      select: { id: true, imagePath: true },
      orderBy: { id: "asc" },
      take,
    }),

  saveHash: (questionId: number, imageHash: Uint8Array<ArrayBuffer>) => prisma.examQuestion.update({ where: { id: questionId }, data: { imageHash }, select: { id: true } }),

  saveRun: (subjectId: number, examSignature: string, hashCursor: number, finishedAt: Date) =>
    prisma.similarityJobRun.upsert({
      where: { subjectId },
      create: { subjectId, examSignature, hashCursor, finishedAt },
      update: { examSignature, hashCursor, finishedAt },
      select: { subjectId: true },
    }),
};
