import { prisma } from "../configs/prisma";
import type { Db } from "./wallet.repository";

export const explanationRepository = {
  // Lời giải thích đã lưu của một câu (dùng chung cho mọi người dùng)
  find: (examId: number, questionNumber: number) =>
    prisma.questionExplanation.findUnique({ where: { examId_questionNumber: { examId, questionNumber } }, select: { content: true } }),

  // Hai người cùng yêu cầu một câu chưa có: chỉ một bản được lưu, bản còn lại bị bỏ qua
  save: (data: { examId: number; questionNumber: number; content: string; model: string }) =>
    prisma.questionExplanation.createMany({ data: [data], skipDuplicates: true }),

  hasPurchased: async (userId: number, examId: number, questionNumber: number) =>
    (await prisma.explanationPurchase.count({ where: { userId, examId, questionNumber } })) > 0,

  // Các câu của một đề mà người dùng đã mua (để giao diện hiện "xem lại miễn phí")
  purchasedNumbers: async (userId: number, examId: number) =>
    (await prisma.explanationPurchase.findMany({ where: { userId, examId }, select: { questionNumber: true } })).map((p) => p.questionNumber),

  createPurchase: (db: Db, data: { userId: number; examId: number; questionNumber: number; price: number }) =>
    db.explanationPurchase.create({ data, select: { id: true } }),

  deletePurchase: (db: Db, userId: number, examId: number, questionNumber: number) =>
    db.explanationPurchase.deleteMany({ where: { userId, examId, questionNumber } }),
};
