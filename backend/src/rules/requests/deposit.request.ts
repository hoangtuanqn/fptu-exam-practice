import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";
import { uuidSchema } from "./admin.request";

export const createDepositBody = z.object({
  amount: z.number("Số tiền không hợp lệ").int("Số tiền phải là số nguyên").max(100_000_000, "Tối đa 100.000.000đ"),
});

export const listDepositsQuery = paginationQuery.extend({
  status: z.enum(["PENDING", "PAID", "EXPIRED"]).optional(),
  userId: uuidSchema.optional(), // chỉ admin được dùng
  q: z.string().trim().max(60).optional(), // admin: mã nạp hoặc email/tên thành viên
});

export const listBankTxQuery = paginationQuery.extend({
  status: z.enum(["MATCHED", "UNMATCHED"]).optional(),
  q: z.string().trim().max(60).optional(), // nội dung chuyển khoản hoặc mã giao dịch
});

// Mã nạp có tiền tố (chữ cái) + 8 ký tự chữ-số, ví dụ NAPK3F9X2QA
export const depositCodeParam = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{6,40}$/, "Mã lệnh nạp không hợp lệ"),
});

export type DepositCodeParam = z.infer<typeof depositCodeParam>;
export type ListBankTxQuery = z.infer<typeof listBankTxQuery>;
export type CreateDepositBody = z.infer<typeof createDepositBody>;
export type ListDepositsQuery = z.infer<typeof listDepositsQuery>;
