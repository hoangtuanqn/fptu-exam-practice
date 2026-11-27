import { prisma } from "../configs/prisma";
import type { Db } from "./wallet.repository";

export const explanationRepository = {
  // Lời giải thích đã lưu của một câu (dùng chung cho mọi người dùng)
  find: (examId: string, questionNumber: number) =>
    prisma.questionExplanation.findUnique({ where: { examId_questionNumber: { examId, questionNumber } }, select: { content: true, createdAt: true } }),

  // Hai người cùng yêu cầu một câu chưa có: chỉ một bản được lưu, bản còn lại bị bỏ qua
  save: (data: { examId: string; questionNumber: number; content: string; model: string }) =>
    prisma.questionExplanation.createMany({ data: [data], skipDuplicates: true }),

  hasPurchased: async (userId: string, examId: string, questionNumber: number) =>
    !!(await prisma.explanationPurchase.findFirst({ where: { userId, examId, questionNumber }, select: { id: true } })),

  // Các câu của một đề mà người dùng đã mua (để giao diện hiện "xem lại miễn phí")
  purchasedNumbers: async (userId: string, examId: string) =>
    (await prisma.explanationPurchase.findMany({ where: { userId, examId }, select: { questionNumber: true } })).map((p) => p.questionNumber),

  // Số câu thật sự (không tính ảnh tài liệu tham khảo) của một đề
  countQuestions: (examId: string) => prisma.examQuestion.count({ where: { examId, isReference: false } }),

  hasUnlocked: async (userId: string, examId: string) => !!(await prisma.explanationUnlock.findFirst({ where: { userId, examId }, select: { id: true } })),

  createUnlock: (db: Db, data: { userId: string; examId: string; price: number; questions: number }) =>
    db.explanationUnlock.create({ data, select: { id: true } }),

  // Số lượt xem thử miễn phí tài khoản đã dùng (tổng mọi đề)
  trialsUsed: (userId: string) => prisma.explanationPurchase.count({ where: { userId, isTrial: true } }),

  // Số người đã mở khóa cả đề này (bằng chứng xã hội, chỉ hiện khi đủ lớn)
  countUnlockBuyers: (examId: string) => prisma.explanationUnlock.count({ where: { examId, price: { gt: 0 } } }),

  createPurchase: (db: Db, data: { userId: string; examId: string; questionNumber: number; price: number; isTrial?: boolean }) =>
    db.explanationPurchase.create({ data, select: { id: true } }),

  deletePurchase: (db: Db, userId: string, examId: string, questionNumber: number) =>
    db.explanationPurchase.deleteMany({ where: { userId, examId, questionNumber } }),
};
