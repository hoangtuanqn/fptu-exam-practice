import rateLimit from "express-rate-limit";

// Chống dò mật khẩu: 20 lần / 15 phút / IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: false, message: "Thử quá nhiều lần, vui lòng quay lại sau" },
});
