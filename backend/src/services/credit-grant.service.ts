import { prisma } from "../configs/prisma";
import { CREDIT_GRANT_BATCH } from "../constants/credit-grant";
import { userNoticeRepository } from "../repositories/user-notice.repository";
import { walletRepository } from "../repositories/wallet.repository";
import { walletService } from "./wallet.service";

export interface CreditGrantResult {
  eligible: number; // thành viên đang hoạt động
  granted: number; // đã cộng (dry-run: sẽ cộng)
  skipped: number; // đã có dòng cộng cùng ghi chú từ lần chạy trước
  failed: number;
}

export const creditGrantService = {
  /**
   * Cộng `amount` credit cho mọi thành viên đang hoạt động. Mỗi người một transaction (sổ cái + chuông thông báo đi cùng
   * walletService.applyChange); một người lỗi không dừng cả lượt. Chạy lại cùng `note` chỉ cộng cho người còn thiếu.
   * Đừng chạy hai lệnh cùng lúc: việc kiểm tra "đã cộng chưa" không khoá giữa hai tiến trình.
   */
  async grantToAllActive(input: { amount: number; note: string; dryRun: boolean }): Promise<CreditGrantResult> {
    const result: CreditGrantResult = { eligible: 0, granted: 0, skipped: 0, failed: 0 };
    let after: string | null = null;
    for (;;) {
      const ids = await userNoticeRepository.activeUserIds(after, CREDIT_GRANT_BATCH);
      if (ids.length) {
        const done = await walletRepository.userIdsWithEntry(prisma, ids, "ADMIN_ADJUST", input.note);
        result.eligible += ids.length;
        for (const userId of ids) {
          if (done.has(userId)) {
            result.skipped++;
            continue;
          }
          if (input.dryRun) {
            result.granted++;
            continue;
          }
          try {
            await prisma.$transaction((tx) => walletService.applyChange(tx, { userId, amount: input.amount, type: "ADMIN_ADJUST", note: input.note }));
            result.granted++;
          } catch (err) {
            result.failed++;
            console.error("[credit-grant] không cộng được cho", userId, (err as Error).message);
          }
        }
      }
      if (ids.length < CREDIT_GRANT_BATCH) break;
      after = ids[ids.length - 1]!;
    }
    return result;
  },
};
