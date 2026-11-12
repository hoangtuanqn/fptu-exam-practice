import { createHash, randomBytes } from "node:crypto";
import { env } from "../configs/env";
import { prisma } from "../configs/prisma";
import { passwordResetRepository } from "../repositories/password-reset.repository";
import { refreshTokenRepository } from "../repositories/refresh-token.repository";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import type { ForgotPasswordBody, LoginBody, RegisterBody, ResetPasswordBody } from "../rules/requests/auth.request";
import { signToken } from "../utils/jwt";
import { comparePassword, hashPassword } from "../utils/password";
import { accountSettingService } from "./account-setting.service";
import { referralService } from "./referral.service";
import { mailService } from "./mail.service";
import { emailVerificationService } from "./email-verification.service";
import { adminNoticeService } from "./admin-notice.service";
import { notificationService } from "./notification.service";
import { captchaService } from "./captcha.service";
import { CAPTCHA_AFTER, LOCK_AFTER, loginGuard } from "../utils/login-guard";

const INVALID_LOGIN = "Email hoặc mật khẩu không đúng";
const INVALID_RESET = "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn";
const RESET_COOLDOWN_MS = 60_000; // tối thiểu 60 giây giữa hai lần gửi thư cho cùng một tài khoản

// Chỉ lưu băm của token: lộ DB cũng không dùng được để đặt lại mật khẩu
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export const authService = {
  async register({ email, fullName, password, referralCode }: RegisterBody) {
    if (await userRepository.existsByEmail(email)) {
      throw AppError.conflict("Email đã được sử dụng", { email: "Email đã được sử dụng" });
    }
    const hashed = await hashPassword(password);
    const code = await referralService.uniqueCode(); // mã giới thiệu của chính người mới

    // Tạo tài khoản và cộng thưởng giới thiệu cùng một transaction: không có chuyện có thưởng mà không có tài khoản
    const { user, notices } = await prisma.$transaction(async (tx) => {
      const created = await userRepository.create({ email, fullName, password: hashed, referralCode: code }, tx);
      // Credit tặng khi đăng ký: cùng transaction với việc tạo tài khoản, lỗi thì không có tài khoản nửa vời
      await accountSettingService.grantSignupCredit(tx, created.id);
      // Lỗi thưởng giới thiệu không được làm hỏng việc đăng ký
      const rewards = await referralService.applyAtSignup(tx, created, referralCode).catch((err: Error) => {
        console.error(`[referral] không áp dụng được mã giới thiệu: ${err.message}`);
        return [];
      });
      return { user: (await userRepository.findById(created.id, tx))!, notices: rewards };
    });
    await emailVerificationService.send(user.id, user.email).catch((err: Error) => console.error(`[verify-email] không gửi được thư xác minh: ${err.message}`));
    referralService.notify(notices);
    adminNoticeService.push("user.registered", { title: "Tài khoản mới đăng ký", body: "Đăng ký bằng email", userId: user.id, link: `/admin/users/${user.id}` });
    return { token: signToken(user.id), user };
  },

  async login({ email, password, captchaToken }: LoginBody, ip: string) {
    const key = `${ip}|${email}`;
    const failed = loginGuard.count(key);
    if (failed >= LOCK_AFTER) throw new AppError("Bạn đã nhập sai quá nhiều lần, vui lòng thử lại sau 15 phút", 429);
    if (failed >= CAPTCHA_AFTER) await captchaService.assert(captchaToken, ip);

    const found = await userRepository.findByEmailWithPassword(email);
    // Cùng một thông báo cho "sai email" và "sai mật khẩu" để không lộ email nào tồn tại
    if (!found || !(await comparePassword(password, found.password))) {
      loginGuard.fail(key);
      const needCaptcha = failed + 1 >= CAPTCHA_AFTER;
      throw new AppError(INVALID_LOGIN, 401, needCaptcha ? { captcha: `${INVALID_LOGIN}. Hãy xác thực captcha để thử lại` } : undefined);
    }
    loginGuard.clear(key);
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

    await this.sendResetLink(user);
  },

  // Tạo token đặt lại mật khẩu và gửi thư (dùng cho "quên mật khẩu" và cho admin gửi hộ thành viên)
  async sendResetLink(user: { id: number; email: string; fullName: string }) {
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
      await refreshTokenRepository.deleteAllOfUser(user.id, tx); // đổi mật khẩu thì mọi thiết bị phải đăng nhập lại
    });
    notificationService.passwordChanged({ userId: user.id, via: "reset" });
  },
};
