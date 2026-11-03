import { prisma } from "../configs/prisma";
import { userRepository, type PublicUser } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import type { AdjustBalanceBody, ListUsersQuery, UpdateUserBody } from "../rules/requests/admin.request";
import { toMeta } from "../utils/pagination";
import { notificationService } from "./notification.service";
import { walletService } from "./wallet.service";

export const adminUserService = {
  async list(query: ListUsersQuery) {
    const { items, total } = await userRepository.list(query);
    return { items, meta: toMeta(query, total) };
  },

  async get(id: number) {
    const user = await userRepository.findById(id);
    if (!user) throw AppError.notFound("Không tìm thấy thành viên");
    return user;
  },

  async update(actor: PublicUser, id: number, body: UpdateUserBody) {
    const before = await this.get(id);
    // Tự hạ quyền / tự khoá mình sẽ làm hệ thống mất admin
    if (id === actor.id && (body.role === "USER" || body.status === "BANNED")) {
      throw new AppError("Không thể tự hạ quyền hoặc tự khoá tài khoản của mình");
    }
    const updated = await userRepository.update(id, body);
    // Trạng thái khóa đổi thì báo cho chính người đó
    if (body.status && body.status !== before.status) {
      notificationService.accountStatusChanged({ userId: id, banned: body.status === "BANNED" });
    }
    return updated;
  },

  async adjustBalance(id: number, { amount, note }: AdjustBalanceBody) {
    await this.get(id);
    const entry = await prisma.$transaction((tx) => walletService.applyChange(tx, { userId: id, amount, type: "ADMIN_ADJUST", note }));
    notificationService.balanceAdjusted({ userId: id, amount, note: note ?? null, balanceAfter: entry.balanceAfter });
    return this.get(id);
  },
};
