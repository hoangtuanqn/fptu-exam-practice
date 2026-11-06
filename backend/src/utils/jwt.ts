import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../configs/env";
import { AppError } from "../rules/error";

export interface TokenPayload {
  sub: string; // user id
}

export const signToken = (userId: number) =>
  jwt.sign({ sub: String(userId) } satisfies TokenPayload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });

// Token để admin đăng nhập thay thành viên: sống ngắn, ghi rõ admin nào đã tạo (không kèm refresh token nên không tự gia hạn)
export const signImpersonationToken = (userId: number, adminId: number) =>
  jwt.sign({ sub: String(userId), imp: adminId }, env.JWT_SECRET, { expiresIn: "2h" });

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    throw AppError.unauthorized();
  }
};
