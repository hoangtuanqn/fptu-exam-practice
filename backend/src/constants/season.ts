// Giao diện theo mùa (admin bật/tắt ở trang cấu hình, lưu trong bảng settings với tiền tố "season.")
export interface SeasonConfig {
  xmasEnabled: boolean; // giao diện Giáng sinh cho toàn site (mặc định bật, admin tắt khi hết mùa)
}

export const SEASON_DEFAULTS: SeasonConfig = {
  xmasEnabled: true,
};

export const SEASON_KEY_PREFIX = "season.";

// Ảnh Giáng sinh trong email chỉ dùng đến hết ngày 05/01/2027 giờ Việt Nam, kể cả khi admin quên tắt
export const XMAS_MAIL_END = new Date("2027-01-06T00:00:00+07:00");
// Gửi thư không đọc DB mỗi lần: nhớ kết quả cờ mùa trong bộ nhớ chừng này
export const SEASON_FLAG_CACHE_MS = 60_000;
