import { emailField } from "./auth.request";
import { z } from "zod";
import { ALL_TOPICS_MASK, MARKETING_PAUSE_DAYS } from "../../constants/marketing";
import { passwordField } from "./auth.request";

// Gửi trường nào thì đổi trường đó (giao diện cũ luôn gửi fullName)
export const updateProfileBody = z
  .object({
    fullName: z.string().trim().min(2, "Họ tên tối thiểu 2 ký tự").max(100).optional(),
    marketingOptOut: z.boolean().optional(), // true = không nhận thư giới thiệu, gợi ý ôn tập
    marketingMutedTopics: z.number().int().min(0).max(ALL_TOPICS_MASK).optional(), // bitmask loại thư đã tắt (constants/marketing TOPIC_BITS)
    pauseMarketingDays: z.union([z.literal(0), z.literal(MARKETING_PAUSE_DAYS)]).optional(), // 0 = bỏ tạm dừng
  })
  .refine((v) => v.fullName !== undefined || v.marketingOptOut !== undefined || v.marketingMutedTopics !== undefined || v.pauseMarketingDays !== undefined, {
    message: "Không có thông tin nào để cập nhật",
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
