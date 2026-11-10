import { prisma } from "../configs/prisma";
import { CREDIT_EXPIRY_BATCH } from "../constants/credit-lot";
import { creditLotRepository } from "../repositories/credit-lot.repository";
import { userRepository } from "../repositories/user.repository";
import { walletRepository } from "../repositories/wallet.repository";

export const creditLotService = {
  /**
   * Remove the unused credit of one expired lot. One transaction: lock the user row (so a spend and the expiry cannot
   * interleave), re-read the lot under lock, zero it and write the ledger entry. Safe to run twice.
   */
  async expireLot(id: number, userId: number) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM users WHERE id = ${userId} FOR UPDATE`;
      const lot = await creditLotRepository.lockOne(tx, id);
      if (!lot || lot.remaining <= 0 || lot.expires_at > new Date()) return 0;
      const current = await userRepository.incrementBalance(tx, userId, 0);
      const take = Math.min(lot.remaining, Math.max(0, current)); // the balance always covers it; the min is a safety net
      await creditLotRepository.setRemaining(tx, id, 0);
      if (take > 0) {
        const balance = await userRepository.incrementBalance(tx, userId, -take);
        await walletRepository.createEntry(tx, { userId, type: "CREDIT_EXPIRED", amount: -take, balanceAfter: balance, note: "Credit giftcode hết hạn chưa dùng" });
      }
      return take;
    });
  },

  // Called by the cron job; one failing lot never stops the batch
  async expireDue() {
    let lots = 0;
    let credit = 0;
    for (const due of await creditLotRepository.listDue(CREDIT_EXPIRY_BATCH)) {
      try {
        const taken = await this.expireLot(due.id, due.userId);
        lots++;
        credit += taken;
      } catch (err) {
        console.error(`[credit-expiry] lô ${due.id}:`, (err as Error).message);
      }
    }
    return { lots, credit };
  },

  // Expiring credit a user still holds (the sweep runs first so the list never shows credit that already ended)
  async mine(userId: number) {
    const due = await creditLotRepository.listDue(CREDIT_EXPIRY_BATCH);
    for (const d of due.filter((x) => x.userId === userId)) await this.expireLot(d.id, userId).catch(() => 0);
    return creditLotRepository.listActiveByUser(userId);
  },
};
