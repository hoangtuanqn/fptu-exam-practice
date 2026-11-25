import { randomBytes } from "node:crypto";
import { DELETED_ACCOUNT_NAME, DELETION_GRACE_DAYS, DELETION_MAX_PER_RUN } from "../constants/account";
import { prisma } from "../configs/prisma";
import { accountDeletionRepository } from "../repositories/account-deletion.repository";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import type { DeleteAccountBody } from "../rules/requests/user.request";
import { hashDeletedEmail } from "../utils/deleted-email";
import { comparePassword, hashPassword } from "../utils/password";
import { DAY_MS } from "../utils/time";
import { userCache } from "../utils/user-cache";
import { avatarService } from "./avatar.service";
import { materialTempFiles } from "./materials/temp-files";
import { notificationService } from "./notification.service";
import { walletService } from "./wallet.service";

const PURGE_TIMEOUT_MS = 60_000;
const GRACE_MS = DELETION_GRACE_DAYS * DAY_MS;

export const accountDeletionService = {
  async request(userId: string, impersonated: boolean, { password, email }: DeleteAccountBody) {
    if (impersonated) throw AppError.forbidden("Không thể xoá tài khoản khi đang đăng nhập thay thành viên");
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw AppError.notFound("Không tìm thấy tài khoản");
    if (user.role === "ADMIN") throw AppError.forbidden("Tài khoản quản trị không thể tự xoá");

    // Tài khoản Google/GitHub không có mật khẩu dùng được nên cho xác nhận bằng cách gõ lại email
    if (password) {
      if (!(await comparePassword(password, user.password))) throw new AppError("Mật khẩu không đúng", 400, { password: "Mật khẩu không đúng" });
    } else if (!(user.googleSub || user.githubId)) {
      throw new AppError("Vui lòng nhập mật khẩu để xác nhận", 400, { password: "Vui lòng nhập mật khẩu để xác nhận" });
    } else if (email !== user.email.toLowerCase()) {
      throw new AppError("Email không khớp với tài khoản", 400, { email: "Email không khớp với tài khoản" });
    }

    const now = new Date();
    const open = await accountDeletionRepository.openWork(userId, now);
    if (open.courseraOrders > 0) throw AppError.conflict("Bạn còn đơn Coursera đang xử lý. Hãy chờ đơn hoàn tất hoặc liên hệ hỗ trợ rồi xoá tài khoản sau.");
    if (open.deposits > 0) throw AppError.conflict("Bạn còn lệnh nạp đang chờ thanh toán. Hãy chờ lệnh hết hạn hoặc được cộng credit rồi thử lại.");

    await accountDeletionRepository.markRequested(userId, now);
    const deleteAt = new Date(now.getTime() + GRACE_MS);
    notificationService.deletionRequested({ email: user.email, name: user.fullName, deleteAt });
    return { deleteAt };
  },

  /** Gọi sau khi xác thực đăng nhập thành công. true = vừa huỷ một yêu cầu xoá. */
  async cancelOnLogin(user: { id: string; deleteRequestedAt: Date | null }) {
    if (!user.deleteRequestedAt) return false;
    if (!(await accountDeletionRepository.cancel(user.id))) throw AppError.unauthorized("Tài khoản này đã bị xoá.");
    return true;
  },

  /** Ẩn danh một tài khoản đã hết thời gian chờ. false = không còn đủ điều kiện (đã huỷ hoặc đã xoá). */
  async erase(userId: string, now = Date.now()) {
    const password = await hashPassword(randomBytes(24).toString("base64url"));
    const files = await prisma.$transaction(
      async (tx) => {
        const user = await accountDeletionRepository.claim(tx, userId, new Date(now - GRACE_MS), new Date(now));
        if (!user) return null;
        // Số dư còn lại ghi một dòng sổ cái để sổ sách vẫn khớp
        if (user.balance > 0) await walletService.applyChange(tx, { userId, amount: -user.balance, type: "CREDIT_EXPIRED", note: "Huỷ số dư do xoá tài khoản" });
        const uploadIds = await accountDeletionRepository.purge(tx, userId);
        await accountDeletionRepository.scrubUser(tx, userId, {
          email: `deleted-${userId}@deleted.invalid`,
          fullName: DELETED_ACCOUNT_NAME,
          password,
          deletedEmailHash: hashDeletedEmail(user.email),
        });
        return { avatarPath: user.avatarPath, uploadIds };
      },
      { timeout: PURGE_TIMEOUT_MS },
    );
    if (!files) return false;
    userCache.invalidate(userId);
    // Tệp xoá sau khi commit; lỗi chỉ ghi log (tệp slide mồ côi còn được job dọn tài liệu quét lại)
    const removals = [...(files.avatarPath ? [avatarService.remove(files.avatarPath)] : []), ...files.uploadIds.map((id) => materialTempFiles.remove(id))];
    for (const r of await Promise.allSettled(removals)) if (r.status === "rejected") console.error(`[account-deletion] không xoá được tệp của #${userId}: ${(r.reason as Error).message}`);
    return true;
  },

  // Chạy mỗi đêm; một tài khoản lỗi không chặn các tài khoản còn lại, lần sau chạy lại
  async runDue(now = Date.now()) {
    let erased = 0;
    for (const id of await accountDeletionRepository.dueIds(new Date(now - GRACE_MS), DELETION_MAX_PER_RUN)) {
      try {
        if (await this.erase(id, now)) erased++;
      } catch (err) {
        console.error(`[account-deletion] #${id}: ${(err as Error).message}`);
      }
    }
    return erased;
  },
};
