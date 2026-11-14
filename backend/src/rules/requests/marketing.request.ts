import { z } from "zod";
import { CAMPAIGN_KEYS, MARKETING_TOPICS, PARAM_LIMITS } from "../../constants/marketing";

// Không kiểm dạng ở đây: token sai dạng hay sai chữ ký đều nhận cùng một lỗi 400 từ service
const tokenField = z.string().optional();

// Hủy một chạm (RFC 8058): token nằm trong query `t` (header List-Unsubscribe), trang web gửi trong body `{ token }`
// mode mặc định "all" nên nút một chạm và giao diện cũ giữ nguyên nghĩa "huỷ tất cả"
export const unsubscribeQuery = z.object({ t: tokenField });
export const unsubscribeBody = z
  .object({ token: tokenField, mode: z.enum(["all", "pause", "topic"]).optional(), topic: z.enum(MARKETING_TOPICS).optional() })
  .refine((v) => v.mode !== "topic" || v.topic !== undefined, { path: ["topic"], message: "Chưa chọn loại thư" })
  .optional();

// ---- Tham số chiến dịch (admin). Ngoài PARAM_LIMITS là 400, không lưu gì.
const inRange = (l: { min: number; max: number }) => z.number().int().min(l.min).max(l.max);
const marketingParamsFields = z.object({
  dailyCap: inRange(PARAM_LIMITS.dailyCap),
  minGapDays: inRange(PARAM_LIMITS.minGapDays),
  winbackStepDays: z
    .tuple([inRange(PARAM_LIMITS.winbackStepDays), inRange(PARAM_LIMITS.winbackStepDays), inRange(PARAM_LIMITS.winbackStepDays)])
    .refine(([a, b, c]) => a < b && b < c, "Các mốc phải tăng dần"),
  winbackMaxInactiveDays: inRange(PARAM_LIMITS.winbackMaxInactiveDays),
  upsellMinPurchases: inRange(PARAM_LIMITS.upsellMinPurchases),
  upsellRepeatDays: inRange(PARAM_LIMITS.upsellRepeatDays),
  expiryStepDays: z.tuple([inRange(PARAM_LIMITS.expiryStepDays), inRange(PARAM_LIMITS.expiryStepDays)]).refine(([a, b]) => a > b, "Mốc nhắc thứ nhất phải xa hơn mốc thứ hai"),
});
// Toàn bộ tham số sau khi gộp phần sửa với giá trị đang lưu (kiểm thêm quan hệ giữa các trường)
export const marketingParamsSchema = marketingParamsFields.refine((p) => p.winbackMaxInactiveDays > p.winbackStepDays[2], {
  path: ["winbackMaxInactiveDays"],
  message: "Phải lớn hơn mốc win-back cuối",
});
export const setParamsBody = marketingParamsFields.partial();
export const previewQuery = z.object({ step: z.coerce.number().int().min(1).default(1) });

// Nút trong thư: chỉ đọc `t`; tham số khác bị bỏ (đích chuyển hướng lấy từ log, không từ URL)
// Liên kết hỏng (t lặp, quá dài) không báo lỗi 400 mà rơi về trang chủ như token sai
export const clickQuery = z.object({ t: z.preprocess((v) => (typeof v === "string" ? v.slice(0, 64) : undefined), z.string().optional()) });
export const setPausedBody = z.object({ paused: z.boolean() });

export const campaignKeyParam = z.object({ key: z.enum(CAMPAIGN_KEYS) });
export const setCampaignBody = z.object({ enabled: z.boolean() });

export type UnsubscribeQuery = z.infer<typeof unsubscribeQuery>;
export type UnsubscribeBody = z.infer<typeof unsubscribeBody>;
export type ClickQuery = z.infer<typeof clickQuery>;
export type SetPausedBody = z.infer<typeof setPausedBody>;
export type CampaignKeyParam = z.infer<typeof campaignKeyParam>;
export type SetCampaignBody = z.infer<typeof setCampaignBody>;
export type SetParamsBody = z.infer<typeof setParamsBody>;
export type PreviewQuery = z.infer<typeof previewQuery>;
