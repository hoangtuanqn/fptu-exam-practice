import { randomBytes } from "node:crypto";
import { env } from "../configs/env";
import { prisma } from "../configs/prisma";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import { signToken } from "../utils/jwt";
import { hashPassword } from "../utils/password";
import { notificationService } from "./notification.service";
import { accountSettingService } from "./account-setting.service";
import { referralService } from "./referral.service";

const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_TIMEOUT_MS = 8_000;

interface GoogleProfile {
  sub: string;
  email: string;
  name: string;
}

const INVALID = "Không xác thực được tài khoản Google, vui lòng thử lại";

async function getJson<T>(url: string, init?: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(GOOGLE_TIMEOUT_MS) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

/**
 * Kiểm tra access token do Google cấp cho ĐÚNG ứng dụng này rồi đọc hồ sơ.
 * - tokeninfo: token còn hạn và `aud` phải trùng GOOGLE_CLIENT_ID (chặn token cấp cho ứng dụng khác)
 * - userinfo: lấy sub, email, tên; Google phải xác nhận email đã được xác minh
 */
async function fetchProfile(accessToken: string): Promise<GoogleProfile> {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new AppError("Đăng nhập bằng Google chưa được cấu hình", 503);

  const info = await getJson<{ aud?: string; azp?: string }>(`${TOKENINFO_URL}?access_token=${encodeURIComponent(accessToken)}`);
  if (!info || (info.aud !== clientId && info.azp !== clientId)) throw new AppError(INVALID, 401);

  const profile = await getJson<{ sub?: string; email?: string; email_verified?: boolean | string; name?: string }>(USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const verified = profile?.email_verified === true || profile?.email_verified === "true";
  if (!profile?.sub || !profile.email || !verified) throw new AppError(INVALID, 401);
  return { sub: profile.sub, email: profile.email.toLowerCase(), name: profile.name?.trim() || profile.email.split("@")[0]! };
}

export const googleAuthService = {
  // Giao diện hỏi client ID để nạp thư viện Google; chưa cấu hình thì ẩn nút
  config: () => ({ clientId: env.GOOGLE_CLIENT_ID ?? null }),

  /**
   * Đăng nhập (hoặc đăng ký) bằng Google. Email do Google xác minh nên tài khoản tự động được xác minh.
   * - đã liên kết Google: đăng nhập
   * - có tài khoản cùng email: liên kết rồi đăng nhập (cũng đánh dấu đã xác minh vì Google đã xác nhận email)
   * - chưa có: tạo tài khoản mới (mật khẩu ngẫu nhiên không dùng được; muốn đăng nhập bằng mật khẩu thì dùng "Quên mật khẩu")
   */
  async login(accessToken: string, referralCode?: string) {
    const profile = await fetchProfile(accessToken);

    const bySub = await userRepository.findByGoogleSub(profile.sub);
    const byEmail = bySub ? null : await userRepository.findByEmailForLink(profile.email);
    const existing = bySub ?? byEmail;

    if (existing) {
      if (existing.status === "BANNED") throw AppError.forbidden("Tài khoản đã bị khoá");
      if (byEmail) {
        await userRepository.linkGoogle(byEmail.id, profile.sub, byEmail.emailVerifiedAt ?? new Date());
      }
      const user = (await userRepository.findById(existing.id))!;
      return { token: signToken(user.id), user, created: false };
    }

    // Tài khoản mới
    const password = await hashPassword(randomBytes(24).toString("base64url"));
    const code = await referralService.uniqueCode();
    const { user, notices } = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { email: profile.email, fullName: profile.name.slice(0, 100), password, referralCode: code, googleSub: profile.sub, emailVerifiedAt: new Date() },
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
    return { token: signToken(user.id), user, created: true };
  },
};
