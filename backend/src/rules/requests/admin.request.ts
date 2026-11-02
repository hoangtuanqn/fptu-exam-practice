import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";

export const idParam = z.object({ id: z.coerce.number().int().positive() });

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

export type IdParam = z.infer<typeof idParam>;
export type ListUsersQuery = z.infer<typeof listUsersQuery>;
export type UpdateUserBody = z.infer<typeof updateUserBody>;
export type AdjustBalanceBody = z.infer<typeof adjustBalanceBody>;
