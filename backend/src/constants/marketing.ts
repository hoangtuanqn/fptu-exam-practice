// Email marketing tự động: chạy mỗi ngày 10:00 giờ Việt Nam. Mọi chiến dịch mặc định TẮT, admin tự bật.
export const MARKETING_RUN_HOUR = 10; // admin chỉ xem, không sửa
export const MARKETING_CRON = `0 ${MARKETING_RUN_HOUR} * * *`;
export const MARKETING_TIMEZONE = "Asia/Ho_Chi_Minh";
export const MARKETING_MAX_PER_RUN = 150; // trần tổng số thư mỗi lần chạy (mọi chiến dịch cộng lại)
export const MARKETING_SEND_GAP_MS = 1000; // nghỉ giữa hai thư để không dồn lên máy chủ thư
export const MARKETING_MIN_GAP_DAYS = 7; // mỗi người tối đa 1 thư marketing mỗi chừng này ngày (trừ nhắc hết hạn Pro)

export const MARKETING_KEY_PREFIX = "marketing."; // cờ bật/tắt lưu trong bảng settings: marketing.<key>.enabled
export const MARKETING_FLAG_CACHE_MS = 60_000;
export const MARKETING_PAUSED_KEY = "marketing.paused"; // "true" = không gửi thư nào (kể cả nhắc hết hạn Pro)

// Đo lường: lượt bấm nút trong thư, mua Pro và quay lại sau thư
export const CLICK_SCANNER_MS = 30_000; // bấm trong chừng này sau khi gửi coi là trình quét thư tự mở link, không tính
export const CONVERSION_DAYS = 7; // mua Pro / quay lại trong chừng này ngày sau thư mới tính "sau thư"
export const STATS_WINDOW_DAYS = 30; // phễu kết quả tính trên thư gửi trong chừng này ngày

export const CAMPAIGN_KEYS = ["winback", "pro_upsell", "pro_expiry"] as const;
export type CampaignKey = (typeof CAMPAIGN_KEYS)[number];

// Win-back: bước gửi khi đã vắng đủ số ngày; mỗi bước chỉ trong khoảng [ngày của nó, ngày của bước sau)
export const WINBACK_STEP_DAYS = [14, 30, 60] as const;
export const WINBACK_MAX_INACTIVE_DAYS = 180; // vắng lâu hơn thì thôi gửi (địa chỉ cũ dễ bị trả về, hại uy tín hộp gửi)
export const WINBACK_NEW_EXAMS_DAYS = 30; // "đề mới của môn bạn" tính trong chừng này ngày
export const WINBACK_CREDIT_EXPIRY_DAYS = 14; // chỉ nhắc credit sắp hết hạn trong chừng này ngày

// Mời Pro
export const UPSELL_SPEND_DAYS = 30;
export const UPSELL_MIN_PURCHASES = 3; // số lần trả lẻ (lấy đề, giải thích AI, tải PE) tối thiểu trong UPSELL_SPEND_DAYS
export const UPSELL_EXAM_DAYS = 30; // hoặc có buổi thi trong chừng này ngày tới
export const UPSELL_REPEAT_DAYS = 45; // mỗi người nhận lại tối đa 1 lần mỗi chừng này ngày

// Nhắc hết hạn Pro: bước 1 còn <= 7 ngày, bước 2 còn <= 1 ngày
export const EXPIRY_STEP_DAYS = [7, 1] as const;

// ---- Tham số admin chỉnh được (lưu trong settings, key MARKETING_PARAMS_KEY, JSON). Hằng số ở trên là giá trị mặc định.
export const MARKETING_PARAMS_KEY = "marketing.params";

export interface MarketingParams {
  dailyCap: number; // trần tổng số thư mỗi ngày (cron chạy 1 lần/ngày)
  minGapDays: number; // mỗi người tối đa 1 thư mỗi chừng này ngày (trừ nhắc hết hạn Pro)
  winbackStepDays: [number, number, number]; // tăng dần
  winbackMaxInactiveDays: number; // lớn hơn bước win-back cuối
  upsellMinPurchases: number;
  upsellRepeatDays: number;
  expiryStepDays: [number, number]; // giảm dần: bước 1 báo trước nhiều ngày hơn bước 2
}

export const DEFAULT_MARKETING_PARAMS: MarketingParams = {
  dailyCap: MARKETING_MAX_PER_RUN,
  minGapDays: MARKETING_MIN_GAP_DAYS,
  winbackStepDays: [...WINBACK_STEP_DAYS],
  winbackMaxInactiveDays: WINBACK_MAX_INACTIVE_DAYS,
  upsellMinPurchases: UPSELL_MIN_PURCHASES,
  upsellRepeatDays: UPSELL_REPEAT_DAYS,
  expiryStepDays: [...EXPIRY_STEP_DAYS],
};

// Trần cứng: nhập sai cũng không gây gửi ào ạt (hạn mức <= 300 thư/ngày, cách nhau >= 3 ngày)
export const PARAM_LIMITS = {
  dailyCap: { min: 1, max: 300 },
  minGapDays: { min: 3, max: 30 },
  winbackStepDays: { min: 7, max: 365 },
  winbackMaxInactiveDays: { min: 30, max: 365 },
  upsellMinPurchases: { min: 1, max: 20 },
  upsellRepeatDays: { min: 14, max: 180 },
  expiryStepDays: { min: 1, max: 30 },
} as const satisfies Record<keyof MarketingParams, { min: number; max: number }>;

// ---- Loại thư người dùng tắt riêng được (bitmask users.marketing_muted_topics)
export const MARKETING_TOPICS = ["review", "offers", "renewal", "news"] as const;
export type MarketingTopic = (typeof MARKETING_TOPICS)[number];
export const TOPIC_BITS: Record<MarketingTopic, number> = { review: 1, offers: 2, renewal: 4, news: 8 };
export const ALL_TOPICS_MASK = 15;
export const MARKETING_PAUSE_DAYS = 30; // "Tạm dừng 30 ngày": chặn mọi thư trừ nhắc hết hạn Pro

// ---- Gửi thủ công (admin soạn, loại thư "news"). Log ghi campaign = broadcast:<id>, step = BROADCAST_STEP (mỗi người nhận tối đa 1 lần).
export const BROADCAST_PREFIX = "broadcast:";
export const BROADCAST_STEP = 1;
export const BROADCAST_TOPIC: MarketingTopic = "news";
export const BROADCAST_SEGMENTS = ["all", "pro", "free", "inactive", "exam_soon"] as const;
export type BroadcastSegment = (typeof BROADCAST_SEGMENTS)[number];
export const BROADCAST_INACTIVE_DAYS = { min: 7, max: 180 } as const; // nhóm "không hoạt động từ N ngày"
export const BROADCAST_EXAM_DAYS = 30; // nhóm "có buổi thi trong chừng này ngày tới"
export const BROADCAST_LIMITS = { subject: 120, body: 5000, ctaLabel: 40, ctaPath: 120 } as const; // khớp độ dài cột
export const BROADCAST_CONFIRM = "GỬI"; // admin phải gõ đúng chữ này mới bắt đầu gửi

/** Tên chiến dịch ghi trong log: một trong CAMPAIGN_KEYS hoặc broadcast:<id>. */
export type LogCampaign = CampaignKey | `broadcast:${number}`;
export const broadcastCampaign = (id: number): LogCampaign => `${BROADCAST_PREFIX}${id}` as LogCampaign;
export const isBroadcast = (c: string) => c.startsWith(BROADCAST_PREFIX);

// Chiến dịch lặp lại ghi step = cycle * 10 + bước (cycle = số ngày UTC từ 1970), để unique (user, campaign, step) không chặn chu kỳ sau
export const STEP_CYCLE_FACTOR = 10;

// Mô tả cho admin dựng theo tham số đang dùng (không lộ ra cho người dùng)
export const CAMPAIGN_META: Record<CampaignKey, { label: string; description: (p: MarketingParams) => string; steps: number; topic: MarketingTopic }> = {
  winback: {
    label: "Gọi người dùng quay lại",
    description: (p) => `Vắng ${p.winbackStepDays.join(", ")} ngày (tối đa ${p.winbackMaxInactiveDays}): số câu còn cần ôn, đề mới của môn, thư cuối hỏi đã thi xong chưa.`,
    steps: 3,
    topic: "review",
  },
  pro_upsell: {
    label: "Mời dùng Pro",
    description: (p) => `Chưa có Pro và đã trả lẻ từ ${p.upsellMinPurchases} lần trong ${UPSELL_SPEND_DAYS} ngày hoặc sắp thi trong ${UPSELL_EXAM_DAYS} ngày. Tối đa 1 thư mỗi ${p.upsellRepeatDays} ngày.`,
    steps: 1,
    topic: "offers",
  },
  pro_expiry: {
    label: "Nhắc Pro sắp hết hạn",
    description: (p) => `Còn ${p.expiryStepDays[0]} ngày và còn ${p.expiryStepDays[1]} ngày. Không tính vào giới hạn 1 thư mỗi ${p.minGapDays} ngày, vẫn gửi khi người dùng tạm dừng thư.`,
    steps: 2,
    topic: "renewal",
  },
};

export const topicOf = (c: LogCampaign): MarketingTopic => (isBroadcast(c) ? BROADCAST_TOPIC : CAMPAIGN_META[c as CampaignKey].topic);
