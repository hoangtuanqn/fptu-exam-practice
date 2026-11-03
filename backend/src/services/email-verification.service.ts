import { createHash, randomBytes } from "node:crypto";
import { env } from "../configs/env";
import { isMailConfigured } from "../configs/mailer";
import { prisma } from "../configs/prisma";
import { HTTP_STATUS } from "../constants/httpStatus";
import { EMAIL_VERIFICATION_COOLDOWN_MS, EMAIL_VERIFICATION_EXPIRES_HOURS } from "../constants/email-verification";
import { emailVerificationRepository } from "../repositories/email-verification.repository";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import type { ChangeEmailBody } from "../rules/requests/user.request";
import { comparePassword } from "../utils/password";
import { notificationService } from "./notification.service";

const INVALID = "Liên kết xác minh không hợp lệ hoặc đã hết hạn";

// Chỉ lưu băm của token: lộ DB cũng không dùng được để xác minh
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const emailVerificationService = {
  /**
   * Tạo token cho địa chỉ `email` (email hiện tại khi đăng ký, hoặc email mới khi đổi email) và gửi thư tới đúng địa chỉ đó.
   * Token cũ chưa dùng của người này bị vô hiệu: chỉ liên kết mới nhất có tác dụng.
   */
  async send(userId: number, email: string, options: { enforceCooldown?: boolean } = {}) {
    if (options.enforceCooldown) {
      const latest = await emailVerificationRepository.latestOf(userId);
      const wait = latest ? EMAIL_VERIFICATION_COOLDOWN_MS - (Date.now() - latest.createdAt.getTime()) : 0;
      if (wait > 0) {
        throw new AppError(`Vui lòng đợi ${Math.ceil(wait / 1000)} giây rồi gửi lại`, HTTP_STATUS.TOO_MANY_REQUESTS);
      }
    }

    const token = randomBytes(32).toString("base64url");
    await prisma.$transaction(async (tx) => {
      await emailVerificationRepository.invalidateAll(tx, userId);
      await tx.emailVerificationToken.create({
        data: { userId, email, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_EXPIRES_HOURS * 3600_000) },
      });
    });

    const link = `${env.CLIENT_URL}/verify-email?token=${token}`;
    // Chưa cấu hình SMTP (máy dev) thì in liên kết ra console để vẫn thử được
    if (!isMailConfigured) console.log(`[verify-email] chưa cấu hình SMTP, liên kết xác minh cho ${email}: ${link}`);
    notificationService.verifyEmail({ userId, email, link });
  },

  // Gửi lại thư xác minh cho email hiện tại (có thời gian chờ giữa hai lần)
  async resend(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) throw AppError.notFound("Không tìm thấy tài khoản");
    if (user.emailVerifiedAt) throw new AppError("Email của bạn đã được xác minh");
    await this.send(userId, user.email, { enforceCooldown: true });
  },

  /**
   * Đổi email: cần mật khẩu hiện tại. Email KHÔNG đổi ngay: thư xác minh gửi tới địa chỉ mới, bấm liên kết xong mới đổi
   * (chứng minh người dùng thực sự sở hữu địa chỉ đó). Trong lúc chờ, tài khoản vẫn dùng email cũ bình thường.
   */
  async requestChange(userId: number, { email, password }: ChangeEmailBody) {
    const user = await userRepository.findByIdWithPassword(userId);
    if (!user) throw AppError.notFound("Không tìm thấy tài khoản");
    if (!(await comparePassword(password, user.password))) {
      throw new AppError("Mật khẩu không đúng", 400, { password: "Mật khẩu không đúng" });
    }
    if (email === user.email) throw new AppError("Đây đã là email hiện tại của bạn", 400, { email: "Đây đã là email hiện tại của bạn" });
    if (await userRepository.existsByEmail(email)) throw AppError.conflict("Email đã được sử dụng", { email: "Email đã được sử dụng" });
    await this.send(userId, email, { enforceCooldown: true });
  },

  /**
   * Bấm liên kết trong thư: đánh dấu đã xác minh, và nếu là liên kết đổi email thì đổi email sang địa chỉ mới.
   * Dùng token bằng điều kiện ở DB nên bấm hai lần hoặc hai yêu cầu cùng lúc chỉ có một lần thành công.
   */
  async verify(token: string) {
    const tokenHash = hashToken(token);
    const record = await emailVerificationRepository.findByHash(tokenHash);
    if (!record || record.usedAt || record.expiresAt <= new Date()) throw new AppError(INVALID);

    const before = await userRepository.findById(record.userId);
    if (!before) throw new AppError(INVALID);
    const changing = record.email !== before.email;
    if (changing && (await userRepository.existsByEmail(record.email))) {
      throw AppError.conflict("Email này vừa được tài khoản khác sử dụng");
    }

    await prisma.$transaction(async (tx) => {
      if (!(await emailVerificationRepository.consume(tx, tokenHash))) throw new AppError(INVALID);
      await userRepository.markEmailVerified(tx, record.userId, record.email);
      await emailVerificationRepository.invalidateAll(tx, record.userId);
    });

    // Lần xác minh đầu tiên: gửi thư chào mừng. Đổi email: báo cho địa chỉ cũ để phát hiện nếu không phải mình.
    if (!before.emailVerifiedAt) notificationService.welcome({ email: record.email, fullName: before.fullName });
    if (changing) notificationService.emailChanged({ oldEmail: before.email, newEmail: record.email, name: before.fullName });
    return { email: record.email };
  },
};
