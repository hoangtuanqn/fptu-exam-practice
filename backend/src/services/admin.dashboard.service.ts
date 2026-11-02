import { bankTransactionRepository } from "../repositories/bank-transaction.repository";
import { depositRepository } from "../repositories/deposit.repository";
import { userRepository } from "../repositories/user.repository";

const countOf = (rows: { status: string; _count: { _all: number } }[], status: string) =>
  rows.find((r) => r.status === status)?._count._all ?? 0;

const startOfTodayVN = () => {
  // 00:00 hôm nay theo giờ Việt Nam (UTC+7)
  const vn = new Date(Date.now() + 7 * 3_600_000);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()) - 7 * 3_600_000);
};

export const adminDashboardService = {
  async overview() {
    const [users, orders, totalDeposited, todayDeposited, unmatched] = await Promise.all([
      userRepository.countByStatus(),
      depositRepository.countByStatus(),
      bankTransactionRepository.sumMatched(),
      bankTransactionRepository.sumMatched(startOfTodayVN()),
      bankTransactionRepository.countUnmatched(),
    ]);

    return {
      users: { active: countOf(users, "ACTIVE"), banned: countOf(users, "BANNED") },
      deposits: {
        pending: countOf(orders, "PENDING"),
        paid: countOf(orders, "PAID"),
        expired: countOf(orders, "EXPIRED"),
        totalDeposited,
        todayDeposited,
        unmatchedTransactions: unmatched, // tiền vào không khớp lệnh nào, cần admin xem
      },
    };
  },
};
