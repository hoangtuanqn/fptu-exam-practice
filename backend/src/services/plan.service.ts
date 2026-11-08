import { prisma } from "../configs/prisma";
import { PRO_BENEFITS, PRO_PLAN } from "../constants/plan";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import { isProUntil } from "../utils/pro";
import { walletService } from "./wallet.service";

const addMonths = (from: Date, months: number) => {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
};

export const planService = {
  // Thông tin gói để hiện trang bán hàng; mức tiết kiệm luôn tính từ giá, không lưu cứng
  info() {
    const { price, fuoPrice, months } = PRO_PLAN;
    const savings = Math.max(0, fuoPrice - price);
    return {
      code: PRO_PLAN.code,
      name: PRO_PLAN.name,
      months,
      price,
      fuoPrice,
      savings,
      savingsPercent: fuoPrice > 0 ? Math.round((savings / fuoPrice) * 100) : 0,
      pricePerMonth: Math.round(price / months),
      benefits: PRO_BENEFITS,
    };
  },

  async isPro(userId: number): Promise<boolean> {
    const row = await prisma.user.findUnique({ where: { id: userId }, select: { proExpiresAt: true } });
    return isProUntil(row?.proExpiresAt);
  },

  /**
   * Mua (hoặc gia hạn) Pro bằng credit. Trừ tiền trước: lệnh UPDATE số dư khóa dòng người dùng nên hai yêu cầu cùng lúc
   * chạy lần lượt; đọc hạn hiện tại SAU khi đã khóa nên mua liên tiếp luôn cộng dồn đúng, không ghi đè nhau.
   * Còn hạn thì tính từ ngày hết hạn cũ, hết hạn rồi thì tính từ bây giờ.
   */
  async purchase(userId: number) {
    const { price, months } = PRO_PLAN;
    const result = await prisma.$transaction(async (tx) => {
      const entry = await walletService.charge(tx, { userId, amount: price, type: "PLAN_CHARGE", note: `Mua gói ${PRO_PLAN.name} ${months} tháng` });
      const row = await tx.user.findUnique({ where: { id: userId }, select: { proExpiresAt: true } });
      if (!row) throw AppError.notFound("Không tìm thấy tài khoản");
      const now = new Date();
      const startsAt = isProUntil(row.proExpiresAt, now) ? row.proExpiresAt! : now;
      const endsAt = addMonths(startsAt, months);
      await tx.user.update({ where: { id: userId }, data: { proExpiresAt: endsAt } });
      await tx.planPurchase.create({ data: { userId, plan: PRO_PLAN.code, months, price, startsAt, endsAt } });
      return { proExpiresAt: endsAt, renewed: startsAt > now, balanceAfter: entry.balanceAfter };
    });
    return { ...result, user: await userRepository.findById(userId) };
  },
};
