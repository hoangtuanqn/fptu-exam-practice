import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";

export const idParam = z.object({ id: z.coerce.number().int().positive() });
export const questionParam = z.object({ id: z.coerce.number().int().positive(), number: z.coerce.number().int().positive() });

export const listUsersQuery = paginationQuery.extend({
  search: z.string().trim().max(100).optional(),
  role: z.enum(["USER", "ADMIN"]).optional(),
  status: z.enum(["ACTIVE", "BANNED"]).optional(),
});

export const updateUserBody = z
  .object({
    fullName: z.string().trim().min(2).max(100),
    role: z.enum(["USER", "ADMIN"]),
    status: z.enum(["ACTIVE", "BANNED"]),
    emailVerified: z.boolean(), // admin xác minh tay (true) hoặc gỡ xác minh (false)
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: "Cần ít nhất một trường để cập nhật" });

// amount > 0: cộng tiền, amount < 0: trừ tiền
export const adjustBalanceBody = z.object({
  amount: z
    .number()
    .int("Số tiền phải là số nguyên")
    .refine((v) => v !== 0, "Số tiền phải khác 0")
    .refine((v) => Math.abs(v) <= 1_000_000_000, "Số tiền quá lớn"),
  note: z.string().trim().min(1, "Vui lòng nhập lý do").max(190),
});

// Để trống mật khẩu thì hệ thống tự sinh mật khẩu ngẫu nhiên
export const resetPasswordBody = z.object({
  password: z.string().min(8, "Mật khẩu tối thiểu 8 ký tự").max(72, "Mật khẩu tối đa 72 ký tự").optional(),
});

export type ResetPasswordByAdminBody = z.infer<typeof resetPasswordBody>;
// Đáp án: các chữ cái A-Z (A hoặc A C D, gõ liền "ACD" cũng được). Chuỗi rỗng = chưa có đáp án.
const questionAnswer = z
  .string()
  .trim()
  .toUpperCase()
  .refine((v) => v === "" || /^[A-Z]( ?[A-Z]){0,7}$/.test(v), "Đáp án không hợp lệ");

export const updateExamQuestionsBody = z.object({
  changes: z
    .array(
      z
        .object({ number: z.number().int().positive(), answer: questionAnswer.optional(), isReference: z.boolean().optional() })
        .refine((c) => c.answer !== undefined || c.isReference !== undefined, "Thiếu nội dung cần sửa"),
    )
    .min(1, "Chưa có thay đổi nào")
    .max(500),
});

export type UpdateExamQuestionsBody = z.infer<typeof updateExamQuestionsBody>;
export const renameExamBody = z.object({ title: z.string().trim().min(1, "Tiêu đề không được để trống").max(255, "Tiêu đề tối đa 255 ký tự") });
export type RenameExamBody = z.infer<typeof renameExamBody>;

export type IdParam = z.infer<typeof idParam>;
export type QuestionParam = z.infer<typeof questionParam>;
export type ListUsersQuery = z.infer<typeof listUsersQuery>;
export type UpdateUserBody = z.infer<typeof updateUserBody>;
export type AdjustBalanceBody = z.infer<typeof adjustBalanceBody>;
