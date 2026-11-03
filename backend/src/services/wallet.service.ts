import type { TransactionType } from "@prisma/client";
import { userRepository } from "../repositories/user.repository";
import { walletRepository, type Db } from "../repositories/wallet.repository";
import { AppError } from "../rules/error";
import { toMeta, type PaginationQuery } from "../utils/pagination";

export const walletService = {
  // Đổi số dư + ghi sổ cái. PHẢI gọi bên trong prisma.$transaction để hai việc cùng thành công hoặc cùng huỷ.
  async applyChange(db: Db, input: { userId: number; amount: number; type: TransactionType; note?: string }) {
    const balance = await userRepository.incrementBalance(db, input.userId, input.amount);
    if (balance < 0) throw new AppError("Số dư không đủ để trừ");
    return walletRepository.createEntry(db, { ...input, balanceAfter: balance });
  },

  // Trừ tiền (số dương). Không đủ số dư thì ném 402 và cả transaction chứa nó bị huỷ.
  async charge(db: Db, input: { userId: number; amount: number; type: TransactionType; note?: string }) {
    const balance = await userRepository.incrementBalance(db, input.userId, -input.amount);
    if (balance < 0) throw AppError.paymentRequired("Số dư không đủ, vui lòng nạp thêm credit");
    return walletRepository.createEntry(db, { ...input, amount: -input.amount, balanceAfter: balance });
  },

  async history(userId: number, query: PaginationQuery) {
    const { items, total } = await walletRepository.listByUser(userId, query);
    return { items, meta: toMeta(query, total) };
  },
};
