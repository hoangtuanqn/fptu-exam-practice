// Cấu hình quảng cáo (admin chỉnh ở trang Quảng cáo, lưu trong bảng settings với tiền tố "ads.")
// Mặc định TẮT hoàn toàn: chưa bật thì web không nạp bất kỳ script quảng cáo nào.
export interface AdsConfig {
  enabled: boolean; // công tắc tổng (tắt khẩn cấp: tắt cái này)
  guests: boolean; // cho khách chưa đăng nhập thấy quảng cáo
  vignette: boolean;
  vignetteZone: string; // mã vùng quảng cáo (chỉ số) lấy từ Monetag
  inpage: boolean;
  inpageZone: string;
  directLink: string; // liên kết trực tiếp, chỉ mở khi người dùng tự bấm (dùng cho nút "Xem quảng cáo")
}

export const ADS_DEFAULTS: AdsConfig = {
  enabled: false,
  guests: true,
  vignette: false,
  vignetteZone: "",
  inpage: false,
  inpageZone: "",
  directLink: "",
};

export const ADS_KEY_PREFIX = "ads.";
