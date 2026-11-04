import rateLimit from "express-rate-limit";

// Yêu cầu quên mật khẩu gửi email thật nên giới hạn chặt hơn: 5 lần / 15 phút / IP
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: false, message: "Bạn yêu cầu quá nhiều lần, vui lòng thử lại sau ít phút" },
});

// Làm mới phiên chạy ngầm mỗi khi access token hết hạn; nhiều người dùng chung một IP (mạng trường) nên nới hơn đăng nhập
export const refreshLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: false, message: "Làm mới phiên quá nhanh, vui lòng thử lại sau giây lát" },
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
