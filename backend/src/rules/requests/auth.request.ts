import { z } from "zod";

export const emailField = z.string().trim().toLowerCase().pipe(z.email("Email không hợp lệ"));

// bcrypt chỉ băm 72 byte đầu nên giới hạn tối đa 72
export const passwordField = z
  .string()
  .min(8, "Mật khẩu tối thiểu 8 ký tự")
  .max(72, "Mật khẩu tối đa 72 ký tự")
  .regex(/[A-Za-z]/, "Mật khẩu cần có chữ cái")
  .regex(/\d/, "Mật khẩu cần có chữ số");

export const registerBody = z.object({
  email: emailField,
  fullName: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự").max(100),
  password: passwordField,
  referralCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/, "Mã giới thiệu không hợp lệ").optional(), // từ liên kết ?ref=
});

export const loginBody = z.object({
  email: emailField,
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
  captchaToken: z.string().max(2048).optional(), // bắt buộc khi đăng nhập sai nhiều lần (xem login-guard)
});

export const forgotPasswordBody = z.object({ email: emailField });

export const resetPasswordBody = z.object({
  token: z.string().min(20, "Liên kết không hợp lệ").max(200, "Liên kết không hợp lệ"),
  password: passwordField,
});

export type ForgotPasswordBody = z.infer<typeof forgotPasswordBody>;
export type ResetPasswordBody = z.infer<typeof resetPasswordBody>;
export type RegisterBody = z.infer<typeof registerBody>;
export type LoginBody = z.infer<typeof loginBody>;

export const googleLoginBody = z.object({
  accessToken: z.string().min(10, "Token không hợp lệ").max(4000, "Token không hợp lệ"),
  referralCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/).optional(), // từ liên kết ?ref= khi người mới đăng ký
});

export type GoogleLoginBody = z.infer<typeof googleLoginBody>;

export const githubLoginBody = z.object({
  code: z.string().regex(/^[A-Za-z0-9_-]{10,100}$/, "Mã không hợp lệ"),
  referralCode: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,12}$/).optional(),
});

export type GithubLoginBody = z.infer<typeof githubLoginBody>;

export const verifyEmailBody = z.object({
  token: z.string().min(20, "Liên kết không hợp lệ").max(200, "Liên kết không hợp lệ"),
});

export type VerifyEmailBody = z.infer<typeof verifyEmailBody>;
