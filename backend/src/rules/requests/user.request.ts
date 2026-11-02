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
