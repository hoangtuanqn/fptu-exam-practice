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

  // Số câu thật sự (không tính ảnh tài liệu tham khảo) của một đề
  countQuestions: (examId: number) => prisma.examQuestion.count({ where: { examId, isReference: false } }),

  hasUnlocked: async (userId: number, examId: number) => (await prisma.explanationUnlock.count({ where: { userId, examId } })) > 0,

  createUnlock: (db: Db, data: { userId: number; examId: number; price: number; questions: number }) =>
    db.explanationUnlock.create({ data, select: { id: true } }),

  // Số lượt xem thử miễn phí tài khoản đã dùng (tổng mọi đề)
  trialsUsed: (userId: number) => prisma.explanationPurchase.count({ where: { userId, isTrial: true } }),

  // Số người đã mở khóa cả đề này (bằng chứng xã hội, chỉ hiện khi đủ lớn)
  countUnlockBuyers: (examId: number) => prisma.explanationUnlock.count({ where: { examId, price: { gt: 0 } } }),

  createPurchase: (db: Db, data: { userId: number; examId: number; questionNumber: number; price: number; isTrial?: boolean }) =>
    db.explanationPurchase.create({ data, select: { id: true } }),

  deletePurchase: (db: Db, userId: number, examId: number, questionNumber: number) =>
    db.explanationPurchase.deleteMany({ where: { userId, examId, questionNumber } }),
};
