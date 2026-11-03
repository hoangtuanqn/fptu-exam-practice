import { emailField } from "./auth.request";
import { z } from "zod";
import { passwordField } from "./auth.request";

export const updateProfileBody = z.object({
  fullName: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự").max(100),
});

export const changePasswordBody = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
    newPassword: passwordField,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ["newPassword"],
    message: "Mật khẩu mới phải khác mật khẩu cũ",
  });

export type UpdateProfileBody = z.infer<typeof updateProfileBody>;
export type ChangePasswordBody = z.infer<typeof changePasswordBody>;

// Đổi email: cần mật khẩu hiện tại; email chỉ đổi sau khi người dùng bấm liên kết gửi tới địa chỉ mới
export const changeEmailBody = z.object({
  email: emailField,
  password: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại"),
});

export type ChangeEmailBody = z.infer<typeof changeEmailBody>;
