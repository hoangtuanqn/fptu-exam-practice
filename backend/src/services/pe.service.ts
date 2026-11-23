import { prisma } from "../configs/prisma";
import { PE_PRICE } from "../constants/pe";

// Tải bộ tài nguyên đề PE đã ngừng; chỉ còn giá (cho giao diện cũ) và lịch sử các lượt tải trước đây
export const peService = {
  price: () => ({ price: PE_PRICE }),

  async history(userId: string) {
    const items = await prisma.peDownload.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 });
    return { items };
  },
};
