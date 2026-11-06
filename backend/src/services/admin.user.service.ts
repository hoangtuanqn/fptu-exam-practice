import { prisma } from "../configs/prisma";
import { userRepository, type PublicUser } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import type { AdjustBalanceBody, ListUsersQuery, ResetPasswordByAdminBody, UpdateUserBody } from "../rules/requests/admin.request";
import { toMeta } from "../utils/pagination";
import { randomBytes } from "node:crypto";
import { passwordResetRepository } from "../repositories/password-reset.repository";
import { refreshTokenRepository } from "../repositories/refresh-token.repository";
import { signImpersonationToken } from "../utils/jwt";
import { hashPassword } from "../utils/password";
import { authService } from "./auth.service";
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
    const { emailVerified, ...rest } = body;
    const updated = await userRepository.update(id, {
      ...rest,
      ...(emailVerified !== undefined && { emailVerifiedAt: emailVerified ? (before.emailVerifiedAt ?? new Date()) : null }),
    });
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

  // Số liệu nhanh để admin nắm tình hình một thành viên khi mở hộp thoại quản lý
  async summary(id: number) {
    await this.get(id);
    const [attempts, exams, deposits, sessions, lastAttempt, referrals] = await Promise.all([
      prisma.examAttempt.count({ where: { userId: id } }),
      prisma.userExam.count({ where: { userId: id } }),
      prisma.depositOrder.aggregate({ where: { userId: id, status: "PAID" }, _sum: { amount: true }, _count: { _all: true } }),
      prisma.refreshToken.count({ where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } } }),
      prisma.examAttempt.findFirst({ where: { userId: id }, orderBy: { id: "desc" }, select: { createdAt: true } }),
      prisma.user.count({ where: { referredById: id } }),
    ]);
    return {
      attempts,
      exams,
      deposits: deposits._count._all,
      depositTotal: deposits._sum.amount ?? 0,
      activeSessions: sessions,
      lastAttemptAt: lastAttempt?.createdAt ?? null,
      referrals,
    };
  },

  // Đặt mật khẩu mới (tự sinh nếu không nhập), đăng xuất mọi thiết bị, báo cho chủ tài khoản. Trả mật khẩu một lần để admin chuyển cho người dùng.
  async resetPassword(actor: PublicUser, id: number, { password }: ResetPasswordByAdminBody) {
    const user = await this.get(id);
    if (user.role === "ADMIN" && user.id !== actor.id) throw AppError.forbidden("Không đặt lại mật khẩu của quản trị viên khác");
    const plain = password ?? randomBytes(9).toString("base64url"); // 12 ký tự
    const hashed = await hashPassword(plain);
    await prisma.$transaction(async (tx) => {
      await userRepository.updatePassword(id, hashed, tx);
      await passwordResetRepository.invalidateAll(tx, id);
      await refreshTokenRepository.deleteAllOfUser(id, tx);
    });
    notificationService.passwordChanged({ userId: id, via: "reset" });
    console.log(`[admin] #${actor.id} đặt lại mật khẩu thành viên #${id}`);
    return { password: plain };
  },

  async sendResetLink(id: number) {
    const user = await this.get(id);
    if (user.status === "BANNED") throw new AppError("Tài khoản đang bị khoá");
    await authService.sendResetLink(user);
  },

  // Đăng xuất mọi thiết bị: xoá hết phiên dài hạn (access token hiện hành tự hết hạn sau ít phút)
  async revokeSessions(actor: PublicUser, id: number) {
    await this.get(id);
    await refreshTokenRepository.deleteAllOfUser(id);
    console.log(`[admin] #${actor.id} đăng xuất mọi thiết bị của thành viên #${id}`);
  },

  // Đăng nhập thay thành viên (xem đúng những gì họ thấy). Chỉ tài khoản thường, không kèm refresh token.
  async impersonate(actor: PublicUser, id: number) {
    const user = await this.get(id);
    if (user.id === actor.id) throw new AppError("Đây là tài khoản của bạn");
    if (user.role === "ADMIN") throw AppError.forbidden("Không đăng nhập thay quản trị viên khác");
    if (user.status === "BANNED") throw new AppError("Tài khoản đang bị khoá, hãy mở khoá trước");
    console.log(`[admin] #${actor.id} đăng nhập thay thành viên #${id}`);
    return { token: signImpersonationToken(user.id, actor.id), user };
  },
};
