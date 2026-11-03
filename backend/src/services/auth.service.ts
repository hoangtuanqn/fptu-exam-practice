import { createHash, randomBytes } from "node:crypto";
import { env } from "../configs/env";
import { prisma } from "../configs/prisma";
import { passwordResetRepository } from "../repositories/password-reset.repository";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import type { ForgotPasswordBody, LoginBody, RegisterBody, ResetPasswordBody } from "../rules/requests/auth.request";
import { signToken } from "../utils/jwt";
import { comparePassword, hashPassword } from "../utils/password";
import { mailService } from "./mail.service";
import { notificationService } from "./notification.service";

const INVALID_LOGIN = "Email hoặc mật khẩu không đúng";
const INVALID_RESET = "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn";
const RESET_COOLDOWN_MS = 60_000; // tối thiểu 60 giây giữa hai lần gửi thư cho cùng một tài khoản

// Chỉ lưu băm của token: lộ DB cũng không dùng được để đặt lại mật khẩu
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const authService = {
  async register({ email, fullName, password }: RegisterBody) {
    if (await userRepository.existsByEmail(email)) {
      throw AppError.conflict("Email đã được sử dụng", { email: "Email đã được sử dụng" });
    }
    const user = await userRepository.create({ email, fullName, password: await hashPassword(password) });
    notificationService.welcome(user);
    return { token: signToken(user.id), user };
  },

  async login({ email, password }: LoginBody) {
    const found = await userRepository.findByEmailWithPassword(email);
    // Cùng một thông báo cho "sai email" và "sai mật khẩu" để không lộ email nào tồn tại
    if (!found || !(await comparePassword(password, found.password))) throw new AppError(INVALID_LOGIN, 401);
    if (found.status === "BANNED") throw AppError.forbidden("Tài khoản đã bị khoá");

    const user = await userRepository.findById(found.id);
    return { token: signToken(found.id), user };
  },

  // Luôn kết thúc êm với mọi email (có hay không có tài khoản) để không lộ email nào đã đăng ký.
  // Gửi thư chạy nền, không chờ, nên thời gian phản hồi cũng không tiết lộ gì.
  async forgotPassword({ email }: ForgotPasswordBody) {
    const user = await userRepository.findByEmailWithPassword(email);
    if (!user || user.status === "BANNED") return;

    const latest = await passwordResetRepository.latestOf(user.id);
    if (latest && Date.now() - latest.createdAt.getTime() < RESET_COOLDOWN_MS) return;

    const token = randomBytes(32).toString("base64url");
    await passwordResetRepository.create({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + env.PASSWORD_RESET_EXPIRES_MIN * 60_000),
    });

    const link = `${env.CLIENT_URL}/reset-password?token=${token}`;
    void mailService
      .sendPasswordReset({ to: user.email, name: user.fullName, link })
      .catch((err: Error) => console.error(`[mail] không gửi được thư đặt lại mật khẩu: ${err.message}`));
  },

  // Dùng token: kiểm tra, đổi mật khẩu và huỷ mọi token còn lại, trong một transaction
  async resetPassword({ token, password }: ResetPasswordBody) {
    const tokenHash = hashToken(token);
    const record = await passwordResetRepository.findByHash(tokenHash);
    if (!record || record.usedAt || record.expiresAt <= new Date()) throw new AppError(INVALID_RESET);

    const user = await userRepository.findByIdWithPassword(record.userId);
    if (!user || user.status === "BANNED") throw new AppError(INVALID_RESET);

    const hashed = await hashPassword(password);
    await prisma.$transaction(async (tx) => {
      // Hai yêu cầu cùng lúc: chỉ một cái chiếm được token
      if (!(await passwordResetRepository.consume(tx, tokenHash))) throw new AppError(INVALID_RESET);
      await userRepository.updatePassword(user.id, hashed, tx);
      await passwordResetRepository.invalidateAll(tx, user.id);
    });
    notificationService.passwordChanged({ userId: user.id, via: "reset" });
  },
};
