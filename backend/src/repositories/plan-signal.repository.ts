import { prisma } from "../configs/prisma";

// Các loại giao dịch là chi tiêu lẻ cho việc mà Pro đã bao gồm (lấy đề, giải thích AI, tải PE) và loại hoàn tiền tương ứng
const SPEND_TYPES = ["CRAWL_CHARGE", "CRAWL_REFUND", "EXPLAIN_CHARGE", "EXPLAIN_REFUND", "PE_CHARGE", "PE_REFUND"] as const;

// Dữ liệu thật của một người, dùng để đưa lời mời Pro đúng lúc (không có gì thì không mời)
export const planSignalRepository = {
  // Buổi thi sắp tới gần nhất trong lịch thi FAP đã đồng bộ (từ `from` trở đi)
  nextExamSlot: (userId: number, from: Date) =>
    prisma.userExamSlot.findFirst({
      where: { userId, examDate: { gte: from } },
      orderBy: [{ examDate: "asc" }, { startTime: "asc" }],
      select: { examDate: true, subjectCode: true },
    }),

  // Ngày thi người dùng tự đặt trong phần nhắc ôn
  async userExamDate(userId: number) {
    const row = await prisma.user.findUnique({ where: { id: userId }, select: { examDate: true } });
    return row?.examDate ?? null;
  },

  // Tổng credit đã chi lẻ từ `since` theo từng loại (số dương = tiền đã tiêu, đã trừ phần hoàn lại)
  async spentSince(userId: number, since: Date) {
    const rows = await prisma.walletTransaction.groupBy({
      by: ["type"],
      where: { userId, createdAt: { gte: since }, type: { in: [...SPEND_TYPES] } },
      _sum: { amount: true },
    });
    const net = (...types: string[]) => -rows.filter((r) => types.includes(r.type)).reduce((n, r) => n + (r._sum.amount ?? 0), 0);
    return { fetch: net("CRAWL_CHARGE", "CRAWL_REFUND"), explain: net("EXPLAIN_CHARGE", "EXPLAIN_REFUND"), pe: net("PE_CHARGE", "PE_REFUND") };
  },
};
