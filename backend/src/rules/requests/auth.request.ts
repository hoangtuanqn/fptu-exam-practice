import { z } from "zod";

// Dùng chung cho validator và service: token sai dạng, hết hạn hay đã dùng đều cùng một cách gỡ
export const INVALID_RESET = "Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được dùng. Hãy yêu cầu liên kết mới ở trang Quên mật khẩu.";
export const INVALID_VERIFY = "Liên kết xác minh email đã hết hạn hoặc đã được dùng. Hãy gửi lại thư xác minh ở trang Hồ sơ.";

const REFERRAL_FORMAT = "Mã giới thiệu gồm 4-12 chữ cái hoặc chữ số. Kiểm tra lại liên kết giới thiệu, hoặc bỏ trống ô này.";

export const emailField = z.string().trim().toLowerCase().pipe(z.email("Email không đúng định dạng, ví dụ: ten@gmail.com"));

// bcrypt chỉ băm 72 byte đầu nên giới hạn tối đa 72
export const passwordField = z
  .string()
  .min(8, "Mật khẩu cần ít nhất 8 ký tự")
  .max(72, "Mật khẩu tối đa 72 ký tự")
  .regex(/[A-Za-z]/, "Mật khẩu cần có chữ cái")
  .regex(/\d/, "Mật khẩu cần có chữ số");

export const registerBody = z.object({
  email: emailField,
  fullName: z.string().trim().min(2, "Họ tên cần ít nhất 2 ký tự").max(100, "Họ tên tối đa 100 ký tự"),
  password: passwordField,
  referralCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/, REFERRAL_FORMAT).optional(), // từ liên kết ?ref=
});

export const loginBody = z.object({
  email: emailField,
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
  captchaToken: z.string().max(2048, "Mã xác minh captcha không hợp lệ, hãy làm lại bước xác minh").optional(), // bắt buộc khi đăng nhập sai nhiều lần (xem login-guard)
});

export const forgotPasswordBody = z.object({ email: emailField });

export const resetPasswordBody = z.object({
  token: z.string(INVALID_RESET).min(20, INVALID_RESET).max(200, INVALID_RESET),
  password: passwordField,
});

export type ForgotPasswordBody = z.infer<typeof forgotPasswordBody>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBody>;
export type RegisterBody = z.infer<typeof registerBody>;
export type LoginBody = z.infer<typeof loginBody>;

const GOOGLE_RETRY = "Đăng nhập bằng Google chưa hoàn tất. Hãy bấm Đăng nhập bằng Google lại.";
const GITHUB_RETRY = "Đăng nhập bằng GitHub chưa hoàn tất hoặc liên kết đã cũ. Hãy bấm Đăng nhập bằng GitHub lại.";

export const googleLoginBody = z.object({
  accessToken: z.string(GOOGLE_RETRY).min(10, GOOGLE_RETRY).max(4000, GOOGLE_RETRY),
  referralCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/, REFERRAL_FORMAT).optional(), // từ liên kết ?ref= khi người mới đăng ký
});

export type GoogleLoginBody = z.infer<typeof googleLoginBody>;

export const githubLoginBody = z.object({
  code: z.string(GITHUB_RETRY).regex(/^[A-Za-z0-9_-]{10,100}$/, GITHUB_RETRY),
  referralCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/, REFERRAL_FORMAT).optional(),
});

export type GithubLoginBody = z.infer<typeof githubLoginBody>;

export const verifyEmailBody = z.object({
  token: z.string(INVALID_VERIFY).min(20, INVALID_VERIFY).max(200, INVALID_VERIFY),
});

export type VerifyEmailBody = z.infer<typeof verifyEmailBody>;
