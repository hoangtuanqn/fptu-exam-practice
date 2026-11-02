import type { Role } from "@prisma/client";
import type { RequestHandler } from "express";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import { verifyToken } from "../utils/jwt";

// Xác thực: đọc Bearer token, nạp user mới nhất từ DB (để khoá/đổi quyền có hiệu lực ngay)
export const authenticate: RequestHandler = async (req, _res, next) => {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");
  if (scheme !== "Bearer" || !token) throw AppError.unauthorized();

  const { sub } = verifyToken(token);
  const user = await userRepository.findById(Number(sub));
  if (!user) throw AppError.unauthorized();
  if (user.status === "BANNED") throw AppError.forbidden("Tài khoản đã bị khoá");

  req.user = user;
  next();
};

// Phân quyền: dùng sau authenticate
export const requireRole =
  (...roles: Role[]): RequestHandler =>
  (req, _res, next) => {
    if (!req.user || !roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };

export const requireAdmin = requireRole("ADMIN");
