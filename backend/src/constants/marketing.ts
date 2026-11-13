// Email marketing tự động: chạy mỗi ngày 10:00 giờ Việt Nam. Mọi chiến dịch mặc định TẮT, admin tự bật.
export const MARKETING_CRON = "0 10 * * *";
export const MARKETING_TIMEZONE = "Asia/Ho_Chi_Minh";
export const MARKETING_MAX_PER_RUN = 150; // trần tổng số thư mỗi lần chạy (mọi chiến dịch cộng lại)
export const MARKETING_SEND_GAP_MS = 1000; // nghỉ giữa hai thư để không dồn lên máy chủ thư
export const MARKETING_MIN_GAP_DAYS = 7; // mỗi người tối đa 1 thư marketing mỗi chừng này ngày (trừ nhắc hết hạn Pro)

export const MARKETING_KEY_PREFIX = "marketing."; // cờ bật/tắt lưu trong bảng settings: marketing.<key>.enabled
export const MARKETING_FLAG_CACHE_MS = 60_000;

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

// Chiến dịch lặp lại ghi step = cycle * 10 + bước (cycle = số ngày UTC từ 1970), để unique (user, campaign, step) không chặn chu kỳ sau
export const STEP_CYCLE_FACTOR = 10;

export const CAMPAIGN_META: Record<CampaignKey, { label: string; description: string; steps: number }> = {
  winback: { label: "Gọi người dùng quay lại", description: "Vắng 14, 30 và 60 ngày: số câu còn cần ôn, đề mới của môn, thư cuối hỏi đã thi xong chưa.", steps: 3 },
  pro_upsell: { label: "Mời dùng Pro", description: "Chưa có Pro và đã trả lẻ từ 3 lần trong 30 ngày hoặc sắp thi trong 30 ngày. Tối đa 1 thư mỗi 45 ngày.", steps: 1 },
  pro_expiry: { label: "Nhắc Pro sắp hết hạn", description: "Còn 7 ngày và còn 1 ngày. Không tính vào giới hạn 1 thư mỗi 7 ngày.", steps: 2 },
};
