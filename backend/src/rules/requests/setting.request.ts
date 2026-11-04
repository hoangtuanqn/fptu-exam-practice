import cron from "node-cron";
import { z } from "zod";

// Cron 5 trường (phút giờ ngày tháng thứ, tối thiểu 1 phút/lần) hoặc 6 trường (thêm GIÂY ở đầu).
// Với 6 trường chỉ nhận giây dạng "giá trị cố định" hoặc "*/N" với N >= 10, để không gọi API SePay quá dồn dập.
const MIN_SECONDS_STEP = 10;

const validCron = (value: string) => {
  const parts = value.split(/\s+/);
  if (![5, 6].includes(parts.length) || !cron.validate(value)) return false;
  if (parts.length === 5) return true;

  const seconds = parts[0]!;
  if (/^\d{1,2}$/.test(seconds)) return true; // giây cố định: chạy một lần mỗi phút
  const step = seconds.match(/^\*\/(\d{1,2})$/);
  return !!step && Number(step[1]) >= MIN_SECONDS_STEP;
};

const cronExpression = z
  .string()
  .trim()
  .refine(validCron, "Biểu thức cron không hợp lệ (5 trường, hoặc 6 trường có giây với bước tối thiểu 10 giây, ví dụ */10 * * * * *)");

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

export const updateAiBody = z.object({
  enabled: z.boolean(),
  anthropicApiKey: z.string().trim().max(300).optional(), // để trống = giữ khóa cũ
  claudeModel: z.string().trim().regex(/^[a-z0-9][a-z0-9.\-]{2,60}$/i, "Tên model không hợp lệ, ví dụ claude-haiku-5-5"),
  effort: z.enum(["low", "medium", "high", "xhigh", "max"]),
  explainPrice: z.number("Phí không hợp lệ").int("Phí phải là số nguyên").min(0, "Tối thiểu 0").max(100_000, "Tối đa 100.000"),
  useSearch: z.boolean(),
});

export const updateReferralBody = z.object({
  enabled: z.boolean(),
  signupBonus: z.number("Số credit không hợp lệ").int("Phải là số nguyên").min(0, "Tối thiểu 0").max(1_000_000, "Tối đa 1.000.000"),
  referrerSignupBonus: z.number("Số credit không hợp lệ").int("Phải là số nguyên").min(0, "Tối thiểu 0").max(1_000_000, "Tối đa 1.000.000"),
  claimWindowDays: z.number("Số ngày không hợp lệ").int("Phải là số nguyên").min(0, "Tối thiểu 0").max(365, "Tối đa 365"),
  commissionPercent: z.number("Tỉ lệ không hợp lệ").int("Phải là số nguyên").min(0, "Tối thiểu 0%").max(100, "Tối đa 100%"),
});

export const updateAccountBody = z.object({
  signupCredit: z.number("Số credit không hợp lệ").int("Phải là số nguyên").min(0, "Tối thiểu 0").max(1_000_000, "Tối đa 1.000.000"),
});

export type UpdateAccountBody = z.infer<typeof updateAccountBody>;

export type UpdateReferralBody = z.infer<typeof updateReferralBody>;

export type UpdateAiBody = z.infer<typeof updateAiBody>;

export const updateCrawlerBody = z.object({
  cookie: z.string().trim().max(8000).optional(), // để trống = giữ cookie cũ
  userAgent: z.string().trim().max(500),
  referer: z.string().trim().max(500),
  requestDelayMs: z.number().int().min(0).max(5000),
  webpQuality: z.number().int().min(30).max(100),
  fetchPrice: z.number().int().min(0).max(1_000_000),
});

export type UpdateCrawlerBody = z.infer<typeof updateCrawlerBody>;
