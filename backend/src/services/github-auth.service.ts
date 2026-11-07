import { env } from "../configs/env";
import { AppError } from "../rules/error";
import { socialAuthService, type SocialProfile } from "./social-auth.service";

const TOKEN_URL = "https://github.com/login/oauth/access_token";
const API = "https://api.github.com";
const TIMEOUT_MS = 8_000;
const INVALID = "Không xác thực được tài khoản GitHub, vui lòng thử lại";

/** Địa chỉ GitHub gọi lại sau khi người dùng đồng ý: một trang của giao diện web (phải khai báo y hệt ở GitHub OAuth App). */
const redirectUri = () => `${env.CLIENT_URL.replace(/\/+$/, "")}/auth/github/callback`;

async function getJson<T>(url: string, init: RequestInit): Promise<T | null> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
    return res.ok ? ((await res.json()) as T) : null;
  } catch {
    return null;
  }
}

const apiHeaders = (token: string) => ({ authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "FEPass" });

/** Đổi `code` (dùng một lần, do GitHub cấp cho ĐÚNG ứng dụng này) lấy access token, rồi đọc hồ sơ + email đã xác minh. */
async function fetchProfile(code: string): Promise<SocialProfile> {
  const { GITHUB_CLIENT_ID: clientId, GITHUB_CLIENT_SECRET: secret } = env;
  if (!clientId || !secret) throw new AppError("Đăng nhập bằng GitHub chưa được cấu hình", 503);

  const tok = await getJson<{ access_token?: string }>(TOKEN_URL, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json", "user-agent": "FEPass" },
    body: JSON.stringify({ client_id: clientId, client_secret: secret, code, redirect_uri: redirectUri() }),
  });
  if (!tok?.access_token) throw new AppError(INVALID, 401);

  const [user, emails] = await Promise.all([
    getJson<{ id?: number; login?: string; name?: string | null; avatar_url?: string }>(`${API}/user`, { headers: apiHeaders(tok.access_token) }),
    getJson<{ email: string; primary: boolean; verified: boolean }[]>(`${API}/user/emails`, { headers: apiHeaders(tok.access_token) }),
  ]);
  const email = (emails?.find((e) => e.primary && e.verified) ?? emails?.find((e) => e.verified))?.email;
  if (!user?.id || !user.login) throw new AppError(INVALID, 401);
  if (!email) throw new AppError("Tài khoản GitHub chưa có email đã xác minh, hãy xác minh email trên GitHub rồi thử lại", 401);
  return { provider: "github", sub: String(user.id), email: email.toLowerCase(), name: user.name?.trim() || user.login, picture: user.avatar_url };
}

export const githubAuthService = {
  // Giao diện hỏi client ID + địa chỉ gọi lại để mở cửa sổ đồng ý; chưa cấu hình đủ thì ẩn nút
  config: () =>
    env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET
      ? { clientId: env.GITHUB_CLIENT_ID, redirectUri: redirectUri() }
      : { clientId: null, redirectUri: null },

  async login(code: string, referralCode?: string) {
    return socialAuthService.login(await fetchProfile(code), referralCode);
  },
};
