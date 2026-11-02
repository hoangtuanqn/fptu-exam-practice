import { z } from "zod";
import { paginationQuery } from "../../utils/pagination";

export const createDepositBody = z.object({
  amount: z.number("Số tiền không hợp lệ").int("Số tiền phải là số nguyên").max(100_000_000, "Tối đa 100.000.000đ"),
});

export const listDepositsQuery = paginationQuery.extend({
  status: z.enum(["PENDING", "PAID", "EXPIRED"]).optional(),
  userId: z.coerce.number().int().positive().optional(), // chỉ admin được dùng
});

export type CreateDepositBody = z.infer<typeof createDepositBody>;
export type ListDepositsQuery = z.infer<typeof listDepositsQuery>;
