import { env } from "../configs/env";
import { AppError } from "../rules/error";
import { socialAuthService, type SocialProfile } from "./social-auth.service";

const TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_TIMEOUT_MS = 8_000;


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
async function fetchProfile(accessToken: string): Promise<SocialProfile> {
  const clientId = env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new AppError("Đăng nhập bằng Google chưa được cấu hình", 503);

  const info = await getJson<{ aud?: string; azp?: string }>(`${TOKENINFO_URL}?access_token=${encodeURIComponent(accessToken)}`);
  if (!info || (info.aud !== clientId && info.azp !== clientId)) throw new AppError(INVALID, 401);

  const profile = await getJson<{ sub?: string; email?: string; email_verified?: boolean | string; name?: string; picture?: string }>(USERINFO_URL, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  const verified = profile?.email_verified === true || profile?.email_verified === "true";
  if (!profile?.sub || !profile.email || !verified) throw new AppError(INVALID, 401);
  return { provider: "google", sub: profile.sub, email: profile.email.toLowerCase(), name: profile.name?.trim() || profile.email.split("@")[0]!, picture: profile.picture };
}


export const googleAuthService = {
  // Giao diện hỏi client ID để nạp thư viện Google; chưa cấu hình thì ẩn nút
  config: () => ({ clientId: env.GOOGLE_CLIENT_ID ?? null }),

  // Đăng nhập (hoặc đăng ký) bằng Google; phần chung nằm ở socialAuthService
  async login(accessToken: string, referralCode?: string) {
    return socialAuthService.login(await fetchProfile(accessToken), referralCode);
  },
};
