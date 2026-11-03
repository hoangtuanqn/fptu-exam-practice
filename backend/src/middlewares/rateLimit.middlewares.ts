import rateLimit from "express-rate-limit";

// Yêu cầu quên mật khẩu gửi email thật nên giới hạn chặt hơn: 5 lần / 15 phút / IP
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: false, message: "Bạn yêu cầu quá nhiều lần, vui lòng thử lại sau ít phút" },
});

// Chống dò mật khẩu: 20 lần / 15 phút / IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: false, message: "Thử quá nhiều lần, vui lòng quay lại sau" },
});

// Chống dò giftcode: chỉ đếm các lần nhập SAI, 10 lần / 15 phút / tài khoản
export const giftCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `user:${req.user?.id ?? "anon"}`,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  message: { status: false, message: "Bạn nhập sai quá nhiều lần, vui lòng thử lại sau ít phút" },
});
