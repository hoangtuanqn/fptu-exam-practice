import { env } from "../configs/env";
import { AppError } from "../rules/error";

const MESSAGE = "Vui lòng xác thực captcha";

export const captchaService = {
  /** Kiểm token Cloudflare Turnstile (dùng một lần). Chưa cấu hình khoá thì bỏ qua. Lỗi -> errors.captcha để giao diện hiện captcha. */
  async assert(token: string | undefined, ip?: string) {
    if (!env.TURNSTILE_SECRET_KEY) return;
    const fail = () => new AppError(MESSAGE, 400, { captcha: MESSAGE });
    if (!token) throw fail();
    try {
      const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
        method: "POST",
        body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: token, ...(ip && { remoteip: ip }) }),
        signal: AbortSignal.timeout(8000),
      });
      if (!((await res.json()) as { success?: boolean }).success) throw fail();
    } catch (err) {
      throw err instanceof AppError ? err : fail(); // Cloudflare không phản hồi: chặn (an toàn hơn cho qua)
    }
  },
};
