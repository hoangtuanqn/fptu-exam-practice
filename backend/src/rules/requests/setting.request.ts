import cron from "node-cron";
import { z } from "zod";

// Chỉ cho cron 5 trường (tối thiểu 1 phút/lần) để không dồn dập gọi API SePay
const cronExpression = z
  .string()
  .trim()
  .refine((v) => v.split(/\s+/).length === 5 && cron.validate(v), "Biểu thức cron không hợp lệ (5 trường)");

export const updateSepayBody = z.object({
  apiToken: z.string().trim().max(255).optional(),
  accountNumber: z.string().trim().regex(/^\d{4,20}$/, "Số tài khoản chỉ gồm 4-20 chữ số"),
  accountName: z.string().trim().max(100),
  bankCode: z.string().trim().min(2, "Vui lòng nhập mã ngân hàng").max(30),
  codePrefix: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2,10}$/, "Tiền tố gồm 2-10 chữ cái"),
  minDeposit: z.number().int().min(1000, "Tối thiểu 1.000đ").max(100_000_000),
  orderExpireMinutes: z.number().int().min(5).max(1440),
  cronEnabled: z.boolean(),
  cronExpression,
});

export type UpdateSepayBody = z.infer<typeof updateSepayBody>;

export const updateCrawlerBody = z.object({
  cookie: z.string().trim().max(8000).optional(), // để trống = giữ cookie cũ
  userAgent: z.string().trim().max(500),
  referer: z.string().trim().max(500),
  requestDelayMs: z.number().int().min(0).max(5000),
  webpQuality: z.number().int().min(30).max(100),
  fetchPrice: z.number().int().min(0).max(1_000_000),
});

export type UpdateCrawlerBody = z.infer<typeof updateCrawlerBody>;
