import rateLimit, { type Options } from "express-rate-limit";

export const TOO_FAST = "Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút";

type LimiterOptions = Partial<Omit<Options, "message">> & { limit: number; message?: string };

/**
 * Bộ giới hạn tốc độ dùng chung: mặc định 60 giây, header chuẩn, thông báo lỗi dạng { status, message } như mọi API khác.
 * Chỉ cần nói số lượt (limit); đổi windowMs, message, skip, keyGenerator... khi cần.
 */
export const makeLimiter = ({ limit, windowMs = 60 * 1000, message = TOO_FAST, ...rest }: LimiterOptions) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { status: false, message }, ...rest });

// Yêu cầu quên mật khẩu gửi email thật nên giới hạn chặt hơn: 5 lần / 15 phút / IP
export const forgotPasswordLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, limit: 5, message: "Bạn yêu cầu quá nhiều lần, vui lòng thử lại sau ít phút" });

// Làm mới phiên chạy ngầm mỗi khi access token hết hạn; nhiều người dùng chung một IP (mạng trường) nên nới hơn đăng nhập
export const refreshLimiter = makeLimiter({ limit: 300, message: "Làm mới phiên quá nhanh, vui lòng thử lại sau giây lát" });

// Chống dò mật khẩu: 30 lần / 15 phút / IP (nới hơn một chút vì nhiều sinh viên dùng chung IP wifi trường/ký túc xá)
export const authLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, limit: 30, message: "Thử quá nhiều lần, vui lòng quay lại sau" });

// Đăng nhập: dò mật khẩu từng tài khoản đã có login-guard (captcha sau 3 lần sai, khoá sau 7 lần),
// nên lớp theo IP này chỉ chặn bắn phá và được nới rộng (nhiều sinh viên dùng chung IP wifi trường)
export const loginLimiter = makeLimiter({ windowMs: 15 * 60 * 1000, limit: 100, message: "Thử quá nhiều lần, vui lòng quay lại sau" });

// Chống dò giftcode: chỉ đếm các lần nhập SAI, 10 lần / 15 phút / tài khoản
export const giftCodeLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `user:${req.user?.id ?? "anon"}`,
  validate: { keyGeneratorIpFallback: false },
  message: "Bạn nhập sai quá nhiều lần, vui lòng thử lại sau ít phút",
});
