import { prisma } from "../configs/prisma";

// Số tin nhắn hỏi AI về lời giải của mỗi người trong một ngày (day = ngày theo giờ Việt Nam, xem utils/time vnDate)
export const explainChatUsageRepository = {
  used: async (userId: number, day: Date) =>
    (await prisma.explainChatUsage.findUnique({ where: { userId_day: { userId, day } }, select: { count: true } }))?.count ?? 0,

  /** Giữ một lượt nếu còn dưới `cap`. Một câu UPDATE có điều kiện nên hai request song song không vượt được cap. */
  reserve: async (userId: number, day: Date, cap: number) => {
    await prisma.explainChatUsage.createMany({ data: [{ userId, day, count: 0 }], skipDuplicates: true });
    const { count } = await prisma.explainChatUsage.updateMany({ where: { userId, day, count: { lt: cap } }, data: { count: { increment: 1 } } });
    return count === 1;
  },

  // AI lỗi: trả lại lượt đã giữ
  release: (userId: number, day: Date) =>
    prisma.explainChatUsage.updateMany({ where: { userId, day, count: { gt: 0 } }, data: { count: { decrement: 1 } } }),
};
