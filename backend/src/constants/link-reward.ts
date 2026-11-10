// Cấu hình "vượt link nhận lượt giải thích miễn phí" (admin chỉnh ở trang Vượt link, lưu trong bảng settings với tiền tố "linkreward.")
export interface LinkRewardConfig {
  enabled: boolean; // công tắc tổng (mặc định TẮT)
  apiToken: string; // token API Link4M, chỉ nằm ở máy chủ, không bao giờ trả ra giao diện
  dailyLimit: number; // số lượt nhận tối đa mỗi người mỗi ngày (Link4M chỉ tính 2 lượt xem / IP / 24 giờ)
  validDays: number; // lượt miễn phí giữ được bao nhiêu ngày
  minSeconds: number; // thời gian tối thiểu từ lúc bấm đến lúc nhận (chống công cụ vượt link tự động)
}

export const LINK_REWARD_DEFAULTS: LinkRewardConfig = {
  enabled: false,
  apiToken: "",
  dailyLimit: 2,
  validDays: 7,
  minSeconds: 25,
};

export const LINK_REWARD_KEY_PREFIX = "linkreward.";
export const LINK_REQUEST_TTL_MS = 30 * 60 * 1000; // link dịch vụ vượt link còn hiệu lực 30 phút
export const MAX_REQUESTS_PER_DAY = 6; // số lần tạo link mỗi người mỗi ngày (giữ số lần gọi Link4M ở mức nhỏ)
export const EXPIRING_SOON_MS = 48 * 3600 * 1000; // báo "sắp hết hạn" khi còn dưới 48 giờ
// Chỉ nhận link rút gọn trả về từ các tên miền này (phòng khi phản hồi từ API bị thay đổi)
export const LINK4M_HOSTS = ["link4m.com", "www.link4m.com", "link4m.co", "www.link4m.co"];
