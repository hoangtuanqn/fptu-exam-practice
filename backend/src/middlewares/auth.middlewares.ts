import type { Role } from "@prisma/client";
import type { Request, RequestHandler } from "express";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import { verifyToken } from "../utils/jwt";
import { userCache } from "../utils/user-cache";

const GUEST_ID = /^[A-Za-z0-9-]{16,64}$/;

// Đọc Bearer token, nạp user (bản lưu tạm tối đa vài giây, xoá ngay khi bảng users bị ghi nên khoá/đổi quyền có hiệu lực ngay)
const loadUser = async (req: Request) => {
  const [scheme, token] = (req.headers.authorization ?? "").split(" ");
  if (scheme !== "Bearer" || !token) throw AppError.unauthorized();

  const { sub } = verifyToken(token);
  const id = Number(sub);
  const user = await userCache.get(id, () => userRepository.findById(id));
  if (!user) throw AppError.unauthorized();
  if (user.status === "BANNED") throw AppError.forbidden("Tài khoản đã bị khoá");
  req.user = user;
};

// Xác thực bắt buộc
export const authenticate: RequestHandler = async (req, _res, next) => {
  await loadUser(req);
  next();
};

// Cho cả thành viên lẫn khách: có token thì phải hợp lệ, không có thì cần header X-Guest-Id.
// Khách chỉ là danh tính ẩn danh theo trình duyệt, không có quyền gì ngoài kho đề của chính mình.
export const identify: RequestHandler = async (req, _res, next) => {
  const guest = req.header("x-guest-id");
  if (guest && GUEST_ID.test(guest)) req.guestId = guest;

  if (req.headers.authorization) await loadUser(req);
  else if (!req.guestId) throw AppError.unauthorized();
  next();
};

// Thành viên chưa xác minh email thì chưa dùng được các dịch vụ tính phí (khách vãng lai không có tài khoản nên không bị chặn).
// Nạp credit, nhận credit (giftcode, giới thiệu) vẫn bình thường: chỉ chặn việc TIÊU dùng.
export const requireVerifiedMember: RequestHandler = (req, _res, next) => {
  if (req.user && !req.user.emailVerifiedAt) {
    throw AppError.forbidden("Vui lòng xác minh email để sử dụng tính năng này. Kiểm tra hộp thư hoặc gửi lại thư xác minh ở trang Hồ sơ.");
  }
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
