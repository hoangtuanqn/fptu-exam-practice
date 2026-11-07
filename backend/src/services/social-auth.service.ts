import { randomBytes } from "node:crypto";
import { prisma } from "../configs/prisma";
import { userRepository, type SocialProvider } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import { signToken } from "../utils/jwt";
import { hashPassword } from "../utils/password";
import { accountSettingService } from "./account-setting.service";
import { avatarService } from "./avatar.service";
import { notificationService } from "./notification.service";
import { referralService } from "./referral.service";

const PICTURE_TIMEOUT_MS = 8_000;
const MAX_PICTURE_BYTES = 2 * 1024 * 1024;

/** Hồ sơ đã được nhà cung cấp xác thực; email PHẢI là email đã xác minh phía nhà cung cấp. */
export interface SocialProfile {
  provider: SocialProvider;
  sub: string;
  email: string;
  name: string;
  picture?: string; // ảnh đại diện (chỉ dùng khi tài khoản chưa có avatar)
}

// Chỉ tin ảnh do chính nhà cung cấp phục vụ (tránh bị lừa tải URL tuỳ ý)
const PICTURE_HOSTS: Record<SocialProvider, RegExp> = {
  google: /(^|\.)googleusercontent\.com$/,
  github: /(^|\.)githubusercontent\.com$/,
};

/** Lấy ảnh đại diện làm avatar. Lỗi gì cũng bỏ qua (không được làm hỏng đăng nhập). */
async function adoptPicture(userId: number, provider: SocialProvider, picture?: string) {
  try {
    if (!picture) return;
    const url = new URL(picture);
    if (url.protocol !== "https:" || !PICTURE_HOSTS[provider].test(url.hostname)) return;
    const sized = provider === "google" ? picture.replace(/=s\d+(-c)?$/, "=s256-c") : picture;
    const res = await fetch(sized, { signal: AbortSignal.timeout(PICTURE_TIMEOUT_MS) });
    if (!res.ok) return;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_PICTURE_BYTES) return;
    const avatarPath = await avatarService.upload(userId, buf);
    await userRepository.update(userId, { avatarPath });
  } catch (err) {
    console.error(`[${provider}] không lấy được ảnh đại diện: ${err instanceof Error ? err.message : err}`);
  }
}

export const socialAuthService = {
  /**
   * Đăng nhập (hoặc đăng ký) bằng tài khoản mạng xã hội. Email do nhà cung cấp xác minh nên tài khoản tự động được xác minh.
   * - đã liên kết: đăng nhập
   * - có tài khoản cùng email: liên kết rồi đăng nhập (cũng đánh dấu đã xác minh)
   * - chưa có: tạo tài khoản mới (mật khẩu ngẫu nhiên không dùng được; muốn đăng nhập bằng mật khẩu thì dùng "Quên mật khẩu")
   */
  async login(profile: SocialProfile, referralCode?: string) {
    const bySub = await userRepository.findBySocial(profile.provider, profile.sub);
    const byEmail = bySub ? null : await userRepository.findByEmailForLink(profile.email);
    const existing = bySub ?? byEmail;

    if (existing) {
      if (existing.status === "BANNED") throw AppError.forbidden("Tài khoản đã bị khoá");
      if (byEmail) {
        await userRepository.linkSocial(byEmail.id, profile.provider, profile.sub, byEmail.emailVerifiedAt ?? new Date());
      }
      let user = (await userRepository.findById(existing.id))!;
      if (!user.avatarPath && profile.picture) {
        await adoptPicture(user.id, profile.provider, profile.picture);
        user = (await userRepository.findById(existing.id))!;
      }
      return { token: signToken(user.id), user, created: false };
    }

    const password = await hashPassword(randomBytes(24).toString("base64url"));
    const code = await referralService.uniqueCode();
    const { user, notices } = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: profile.email,
          fullName: profile.name.slice(0, 100),
          password,
          referralCode: code,
          ...(profile.provider === "google" ? { googleSub: profile.sub } : { githubId: profile.sub }),
          emailVerifiedAt: new Date(),
        },
        select: { id: true, fullName: true },
      });
      await accountSettingService.grantSignupCredit(tx, created.id);
      const rewards = await referralService.applyAtSignup(tx, created, referralCode).catch((err: Error) => {
        console.error(`[referral] không áp dụng được mã giới thiệu: ${err.message}`);
        return [];
      });
      return { user: (await userRepository.findById(created.id, tx))!, notices: rewards };
    });
    notificationService.welcome(user);
    referralService.notify(notices);
    await adoptPicture(user.id, profile.provider, profile.picture);
    return { token: signToken(user.id), user: (await userRepository.findById(user.id)) ?? user, created: true };
  },
};
