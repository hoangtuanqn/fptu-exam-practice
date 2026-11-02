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
});

export const loginBody = z.object({
  email: emailField,
  password: z.string().min(1, "Vui lòng nhập mật khẩu"),
});

export type RegisterBody = z.infer<typeof registerBody>;
export type LoginBody = z.infer<typeof loginBody>;
