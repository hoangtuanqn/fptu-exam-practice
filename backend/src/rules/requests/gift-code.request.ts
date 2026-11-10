import { z } from "zod";
import { CREDIT_TTL_MAX_MINUTES } from "../../constants/credit-lot";
import { paginationQuery } from "../../utils/pagination";

// Mã viết hoa, chữ-số và dấu gạch ngang; người dùng gõ thường hay có khoảng trắng vẫn được chuẩn hóa
const giftCodeValue = z
  .string("Vui lòng nhập mã")
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9-]{4,32}$/, "Mã chỉ gồm chữ, số và dấu gạch ngang (4-32 ký tự)");

export const redeemGiftCodeBody = z.object({ code: giftCodeValue });

export const createGiftCodeBody = z.object({
  code: giftCodeValue.optional(), // bỏ trống = hệ thống tự sinh
  amount: z
    .number("Số credit không hợp lệ")
    .int("Số credit phải là số nguyên")
    .min(1, "Tối thiểu 1 credit")
    .max(10_000_000, "Tối đa 10.000.000 credit"),
  maxUses: z
    .number("Số lượt không hợp lệ")
    .int("Số lượt phải là số nguyên")
    .min(1, "Tối thiểu 1 lượt")
    .max(100_000, "Tối đa 100.000 lượt"),
  expiresAt: z.iso.datetime({ offset: true, message: "Hạn dùng không hợp lệ" }).optional(), // bỏ trống = không hết hạn
  note: z.string().trim().max(200, "Ghi chú tối đa 200 ký tự").optional(),
  // Thời hạn của credit tính từ lúc người dùng nhập mã (phút); bỏ trống = credit vĩnh viễn
  creditTtlMinutes: z.number("Thời hạn không hợp lệ").int("Thời hạn phải là số nguyên").min(1, "Tối thiểu 1 phút").max(CREDIT_TTL_MAX_MINUTES, "Tối đa 1 năm").optional(),
});

export const updateGiftCodeBody = z.object({ active: z.boolean() });

export const listGiftCodesQuery = paginationQuery.extend({
  q: z.string().trim().toUpperCase().max(32).optional(), // tìm theo mã
  active: z.enum(["true", "false"]).optional(),
});

export type RedeemGiftCodeBody = z.infer<typeof redeemGiftCodeBody>;
export type CreateGiftCodeBody = z.infer<typeof createGiftCodeBody>;
export type UpdateGiftCodeBody = z.infer<typeof updateGiftCodeBody>;
export type ListGiftCodesQuery = z.infer<typeof listGiftCodesQuery>;
