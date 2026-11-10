import type { TransactionType } from "@prisma/client";
import { creditLotRepository } from "../repositories/credit-lot.repository";
import { userRepository } from "../repositories/user.repository";
import { walletRepository, type Db } from "../repositories/wallet.repository";
import { AppError } from "../rules/error";
import { toMeta, type PaginationQuery } from "../utils/pagination";

// Spending uses expiring credit first (earliest expiry first), so what is left in the balance after a debit is always the
// longest-lived credit. Must run in the same transaction as the balance change, after it (the user row lock serialises spenders).
async function spendLots(db: Db, userId: number, amount: number) {
  let left = amount;
  for (const lot of await creditLotRepository.lockUsable(db, userId)) {
    if (left <= 0) break;
    const take = Math.min(left, lot.remaining);
    await creditLotRepository.setRemaining(db, lot.id, lot.remaining - take);
    left -= take;
  }
}

export const walletService = {
  // Đổi số dư + ghi sổ cái. PHẢI gọi bên trong prisma.$transaction để hai việc cùng thành công hoặc cùng huỷ.
  async applyChange(db: Db, input: { userId: number; amount: number; type: TransactionType; note?: string }) {
    const balance = await userRepository.incrementBalance(db, input.userId, input.amount);
    if (balance < 0) throw new AppError("Số dư không đủ để trừ");
    if (input.amount < 0) await spendLots(db, input.userId, -input.amount);
    return walletRepository.createEntry(db, { ...input, balanceAfter: balance });
  },

  // Trừ tiền (số dương). Không đủ số dư thì ném 402 và cả transaction chứa nó bị huỷ.
  async charge(db: Db, input: { userId: number; amount: number; type: TransactionType; note?: string }) {
    const balance = await userRepository.incrementBalance(db, input.userId, -input.amount);
    if (balance < 0) throw AppError.paymentRequired("Số dư không đủ, vui lòng nạp thêm credit");
    await spendLots(db, input.userId, input.amount);
    return walletRepository.createEntry(db, { ...input, amount: -input.amount, balanceAfter: balance });
  },

  async history(userId: number, query: PaginationQuery) {
    const { items, total } = await walletRepository.listByUser(userId, query);
    return { items, meta: toMeta(query, total) };
  },
};
