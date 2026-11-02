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

export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    throw AppError.unauthorized();
  }
};
