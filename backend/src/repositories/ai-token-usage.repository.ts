import { prisma } from "../configs/prisma";

// Sổ token AI theo người dùng và tính năng (dùng cho giới hạn theo cửa sổ trượt)

export interface TokenUsageInput {
  userId: number;
  feature: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export const aiTokenUsageRepository = {
  record: (u: TokenUsageInput) => prisma.aiTokenUsage.create({ data: u, select: { id: true } }),

  /** Xoá các lượt dùng ghi trước mốc `before` (đã ra khỏi mọi cửa sổ). Trả số dòng đã xoá. */
  deleteBefore: async (before: Date) => (await prisma.aiTokenUsage.deleteMany({ where: { createdAt: { lt: before } } })).count,

  /** Các lượt dùng ghi SAU mốc `since` (đọc theo chỉ mục user_id, feature, created_at). */
  since: (userId: number, feature: string, since: Date) =>
    prisma.aiTokenUsage.findMany({
      where: { userId, feature, createdAt: { gt: since } },
      select: { createdAt: true, totalTokens: true },
      orderBy: { createdAt: "asc" },
    }),
};
