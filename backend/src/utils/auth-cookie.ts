import type { Request, Response } from "express";
import { env, isProd } from "../configs/env";

const COOKIE_NAME = "rt";
const DAY_MS = 24 * 60 * 60 * 1000;

// httpOnly: JavaScript (kể cả mã độc chèn vào trang) không đọc được. Path giới hạn: trình duyệt chỉ gửi kèm cho /auth.
// SameSite=Lax: web (fepass.top) và API (api.fepass.top) cùng "site" nên vẫn gửi được, còn trang của site khác thì không.
const baseOptions = () => ({ httpOnly: true, secure: isProd, sameSite: "lax" as const, path: "/api/v1/auth" });

export const setRefreshCookie = (res: Response, token: string) =>
  res.cookie(COOKIE_NAME, token, { ...baseOptions(), maxAge: env.REFRESH_TOKEN_DAYS * DAY_MS });

export const clearRefreshCookie = (res: Response) => res.clearCookie(COOKIE_NAME, baseOptions());

export const readRefreshCookie = (req: Request): string | null => {
  for (const part of (req.headers.cookie ?? "").split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === COOKIE_NAME) {
      const value = part.slice(i + 1).trim();
      return value || null;
    }
  }
  return null;
};

// Lớp chặn thứ hai ngoài SameSite: yêu cầu có Origin thì phải đúng là trang web của mình
export const isTrustedOrigin = (req: Request) => {
  const origin = req.headers.origin;
  return !origin || origin.replace(/\/+$/, "") === env.CLIENT_URL.replace(/\/+$/, "");
};
