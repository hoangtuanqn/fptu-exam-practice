import type { Request } from "express";
import rateLimit, { type Options, type RateLimitInfo } from "express-rate-limit";
import { EXAM_COMMENT_PER_MINUTE } from "../constants/exam-comment";
import { waitText } from "../utils/format";

export const TOO_FAST = "Bạn thao tác quá nhanh.";

type Cause = string | ((req: Request) => string);
type LimiterOptions = Partial<Omit<Options, "message">> & { limit: number; message?: Cause };

/**
 * Bộ giới hạn tốc độ dùng chung: mặc định 60 giây, header chuẩn (có Retry-After), lời nhắn dạng { status, message, code, data } như mọi API khác.
 * `message` là câu nêu NGUYÊN NHÂN (thao tác gì bị chặn); thời gian chờ thật (tính từ lúc bộ đếm reset) được nối vào sau.
 * Không bao giờ nói số lượt hay độ dài cửa sổ.
 */
export const makeLimiter = ({ limit, windowMs = 60 * 1000, message = TOO_FAST, ...rest }: LimiterOptions) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    message: (req: Request) => {
      const reset = (req as Request & { rateLimit?: RateLimitInfo }).rateLimit?.resetTime;
      const waitMs = reset ? reset.getTime() - Date.now() : windowMs;
      const cause = typeof message === "function" ? message(req) : message;
      return {
        status: false,
        message: `${cause} Vui lòng thử lại sau ${waitText(waitMs)}.`,
        code: "RATE_LIMITED",
        data: { retryAfter: Math.max(1, Math.ceil(waitMs / 1000)) },
      };
    },
    ...rest,
  });

// Nhiều sinh viên dùng chung IP wifi trường/ký túc xá: chỉ cách này người dùng tự làm được ngay
const SHARED_NETWORK_HINT = "Nếu bạn đang dùng wifi chung (trường, ký túc xá), hãy thử chuyển sang 4G.";

// Yêu cầu quên mật khẩu gửi email thật nên giới hạn chặt hơn: 5 lần / 15 phút / IP
export const forgotPasswordLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  message: "Bạn đã yêu cầu gửi thư đặt lại mật khẩu quá nhiều lần. Hãy kiểm tra hộp thư (cả mục Spam) trước.",
});

// Làm mới phiên chạy ngầm mỗi khi access token hết hạn; nhiều người dùng chung một IP (mạng trường) nên nới hơn đăng nhập
export const refreshLimiter = makeLimiter({ limit: 1000, message: "Phiên đăng nhập được làm mới quá nhiều lần từ mạng này." });

// Tên thao tác theo đường dẫn của authRouter (một bộ đếm chung cho các route này)
const AUTH_ACTIONS: Record<string, string> = {
  "/register": "đăng ký tài khoản",
  "/reset-password": "đặt lại mật khẩu",
  "/google": "đăng nhập bằng Google",
  "/github": "đăng nhập bằng GitHub",
  "/verify-email": "xác minh email",
};

// Chống bắn phá đăng ký/đặt lại mật khẩu/đăng nhập Google, GitHub 300 lần / 15 phút / IP (rất nhiều sinh viên dùng chung IP wifi trường/ký túc xá)
export const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  message: (req) => `Có quá nhiều lượt ${AUTH_ACTIONS[req.path] ?? "thao tác tài khoản"} từ mạng bạn đang dùng. ${SHARED_NETWORK_HINT}`,
});

// Đăng nhập: dò mật khẩu từng tài khoản đã có login-guard (captcha sau 3 lần sai, khoá sau 7 lần),
// nên lớp theo IP này chỉ chặn bắn phá và được nới rộng (nhiều sinh viên dùng chung IP wifi trường)
export const loginLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  message: `Bạn đã thử đăng nhập quá nhiều lần từ mạng này. ${SHARED_NETWORK_HINT}`,
});

// Chống dò giftcode: chỉ đếm các lần nhập SAI, 10 lần / 15 phút / tài khoản
export const giftCodeLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `user:${req.user?.id ?? "anon"}`,
  validate: { keyGeneratorIpFallback: false },
  message: "Bạn đã nhập sai mã quá nhiều lần nên tạm thời chưa nhập được mã mới.",
});

// Gửi bình luận câu hỏi: theo tài khoản (dùng sau authenticate); giới hạn theo ngày đếm trong DB ở exam-comment.service
export const examCommentLimiter = makeLimiter({
  limit: EXAM_COMMENT_PER_MINUTE,
  keyGenerator: (req) => `user:${req.user?.id ?? "anon"}`,
  validate: { keyGeneratorIpFallback: false },
  message: "Bạn gửi bình luận quá nhanh.",
});
