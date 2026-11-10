// Cấu hình "vượt link nhận lượt giải thích miễn phí" (admin chỉnh ở trang Vượt link, lưu trong bảng settings với tiền tố "linkreward.")
export interface LinkRewardConfig {
  enabled: boolean; // công tắc tổng (mặc định TẮT)
  link4mEnabled: boolean; // dùng Link4M (khi công tắc tổng bật và có token)
  apiToken: string; // token API Link4M, chỉ nằm ở máy chủ, không bao giờ trả ra giao diện
  dailyLimit: number; // số lượt nhận tối đa mỗi người mỗi ngày qua Link4M (Link4M chỉ tính 2 lượt xem / IP / 24 giờ)
  shrinkmeEnabled: boolean; // dùng ShrinkMe (mặc định TẮT)
  shrinkmeToken: string; // token API ShrinkMe, chỉ nằm ở máy chủ
  shrinkmeDailyLimit: number; // số lượt nhận tối đa mỗi người mỗi ngày qua ShrinkMe (chỉ tính 1 lượt xem duy nhất / 24 giờ)
  validDays: number; // lượt miễn phí giữ được bao nhiêu ngày
  minSeconds: number; // thời gian tối thiểu từ lúc bấm đến lúc nhận (chống công cụ vượt link tự động)
}

export const LINK_REWARD_DEFAULTS: LinkRewardConfig = {
  enabled: false,
  link4mEnabled: true,
  apiToken: "",
  dailyLimit: 2,
  shrinkmeEnabled: false,
  shrinkmeToken: "",
  shrinkmeDailyLimit: 1,
  validDays: 7,
  minSeconds: 25,
};

export const LINK_REWARD_KEY_PREFIX = "linkreward.";
export const LINK_REQUEST_TTL_MS = 30 * 60 * 1000; // link dịch vụ vượt link còn hiệu lực 30 phút
export const MAX_REQUESTS_PER_DAY = 6; // số lần tạo link mỗi người mỗi ngày (giữ số lần gọi dịch vụ ngoài ở mức nhỏ)
export const EXPIRING_SOON_MS = 48 * 3600 * 1000; // báo "sắp hết hạn" khi còn dưới 48 giờ

export type LinkProvider = "link4m" | "shrinkme";

interface ProviderDef {
  label: string;
  apiUrl: (token: string, destination: string) => string;
  hosts: string[]; // chỉ nhận link rút gọn trả về từ các tên miền này (phòng khi phản hồi từ API bị thay đổi)
}

const query = (token: string, destination: string) => `api=${encodeURIComponent(token)}&url=${encodeURIComponent(destination)}`;

// Thứ tự trong đây là thứ tự ưu tiên khi chọn dịch vụ cho người dùng
export const LINK_PROVIDERS: Record<LinkProvider, ProviderDef> = {
  link4m: {
    label: "Link4M",
    apiUrl: (token, destination) => `https://link4m.co/api-shorten/v2?${query(token, destination)}`,
    hosts: ["link4m.com", "www.link4m.com", "link4m.co", "www.link4m.co"],
  },
  shrinkme: {
    label: "ShrinkMe",
    apiUrl: (token, destination) => `https://shrinkme.io/api?${query(token, destination)}`,
    hosts: ["shrinkme.io", "www.shrinkme.io", "shrinkme.click", "www.shrinkme.click"],
  },
};

export const LINK_PROVIDER_ORDER = Object.keys(LINK_PROVIDERS) as LinkProvider[];
