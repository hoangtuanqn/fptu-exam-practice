import { z } from "zod";
import { BROADCAST_INACTIVE_DAYS, BROADCAST_LIMITS, BROADCAST_SEGMENTS, CAMPAIGN_KEYS, MARKETING_TOPICS, PARAM_LIMITS } from "../../constants/marketing";
import { paginationQuery } from "../../utils/pagination";

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

// ---- Gửi thủ công
// Đường dẫn nội bộ: bắt đầu bằng "/" nhưng không phải "//" (địa chỉ ngoài), không có khoảng trắng hay "\" (trình duyệt hiểu như "/")
export const INTERNAL_PATH = /^\/(?!\/)[^\s\\]*$/;
const L = BROADCAST_LIMITS;
const oneLine = (max: number, label: string) =>
  z.string().trim().min(1, `Chưa nhập ${label}`).max(max, `${label} tối đa ${max} ký tự`).refine((s) => !/[\r\n]/.test(s), `${label} chỉ một dòng`);

export const createBroadcastBody = z
  .object({
    subject: oneLine(L.subject, "Tiêu đề"),
    body: z.string().trim().min(1, "Chưa nhập nội dung").max(L.body, `Nội dung tối đa ${L.body} ký tự`),
    ctaLabel: oneLine(L.ctaLabel, "Nhãn nút"),
    ctaPath: z.string().trim().max(L.ctaPath).regex(INTERNAL_PATH, "Đường dẫn nút phải là đường dẫn trong trang, bắt đầu bằng /"),
    segment: z.enum(BROADCAST_SEGMENTS),
    segmentDays: z.number().int().min(BROADCAST_INACTIVE_DAYS.min).max(BROADCAST_INACTIVE_DAYS.max).optional(),
  })
  .refine((v) => v.segment !== "inactive" || v.segmentDays !== undefined, { path: ["segmentDays"], message: "Chưa nhập số ngày không hoạt động" });

// Chữ xác nhận "GỬI" do service kiểm tra (thiếu hoặc sai là 400, không bắt đầu gì)
export const startBroadcastBody = z.object({ confirm: z.unknown() }).partial().optional();

export const listBroadcastsQuery = paginationQuery;

// Ngày theo giờ Việt Nam (YYYY-MM-DD) -> 0h ngày đó
const vnDay = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ")
  .transform((s) => new Date(`${s}T00:00:00+07:00`))
  .refine((d) => !Number.isNaN(d.getTime()), "Ngày không hợp lệ");

export const listLogsQuery = paginationQuery.extend({
  campaign: z.union([z.enum(CAMPAIGN_KEYS), z.literal("broadcast"), z.string().regex(/^broadcast:\d{1,10}$/)]).optional(),
  from: vnDay.optional(),
  to: vnDay.optional(), // gồm cả ngày này
  email: z.string().trim().min(1).max(100).optional(),
});

export type UnsubscribeQuery = z.infer<typeof unsubscribeQuery>;
export type UnsubscribeBody = z.infer<typeof unsubscribeBody>;
export type ClickQuery = z.infer<typeof clickQuery>;
export type SetPausedBody = z.infer<typeof setPausedBody>;
export type CampaignKeyParam = z.infer<typeof campaignKeyParam>;
export type SetCampaignBody = z.infer<typeof setCampaignBody>;
export type SetParamsBody = z.infer<typeof setParamsBody>;
export type PreviewQuery = z.infer<typeof previewQuery>;
export type CreateBroadcastBody = z.infer<typeof createBroadcastBody>;
export type StartBroadcastBody = z.infer<typeof startBroadcastBody>;
export type ListBroadcastsQuery = z.infer<typeof listBroadcastsQuery>;
export type ListLogsQuery = z.infer<typeof listLogsQuery>;
