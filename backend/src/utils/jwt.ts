import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../configs/env";
import { AppError } from "../rules/error";
import { uuidSchema } from "../rules/requests/admin.request";

export interface TokenPayload {
  sub: string; // user id (UUID v7)
}

export const signToken = (userId: string) =>
  jwt.sign({ sub: userId } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });

// Token để admin đăng nhập thay thành viên: sống ngắn, ghi rõ admin nào đã tạo (không kèm refresh token nên không tự gia hạn)
export const signImpersonationToken = (userId: string, adminId: string) =>
  jwt.sign({ sub: userId, imp: adminId }, env.JWT_SECRET, { expiresIn: "2h" });

export const verifyToken = (token: string): TokenPayload & { impersonated: boolean } => {
  let payload: jwt.JwtPayload | string;
  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw AppError.unauthorized();
  }
  // Tokens issued before migration 0080 carry a numeric id: 401 so the client renews through the refresh cookie
  const sub = uuidSchema.safeParse(typeof payload === "string" ? undefined : payload.sub);
  if (!sub.success) throw AppError.unauthorized();
  return { sub: sub.data, impersonated: !!(payload as jwt.JwtPayload).imp };
};
