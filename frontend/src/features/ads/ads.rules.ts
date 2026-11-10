// Quy tắc quyết định khi nào được nạp quảng cáo. Thuần (không phụ thuộc React) để kiểm thử được.

// Chỉ những trang này mới nạp quảng cáo: trang công khai và các trang "nghỉ" (kho đề, kết quả). Mọi trang khác KHÔNG có quảng cáo:
// làm bài, admin, đăng nhập, nạp tiền, Điểm FAP, hồ sơ, gói Pro...
const ALLOWED_PREFIXES = ["/mon/", "/account/exams", "/account/attempts", "/features", "/changelog"];
const ALLOWED_EXACT = ["/account"];

export const isAdPath = (pathname: string) => {
  const p = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return ALLOWED_EXACT.includes(p) || ALLOWED_PREFIXES.some((x) => (x.endsWith("/") ? p.startsWith(x) : p === x || p.startsWith(`${x}/`)));
};

// Script quảng cáo luôn tải từ địa chỉ cố định trong code (admin chỉ nhập mã vùng), tránh việc cài đặt trỏ script tới nơi lạ.
export const AD_SCRIPTS = {
  vignette: "https://n6wxm.com/vignette.min.js",
  inpage: "https://nap5k.com/tag.min.js",
} as const;

export interface AdsPublicConfig {
  enabled: boolean;
  guests: boolean;
  vignette: string | null;
  inpage: string | null;
  directLink: string;
}

export interface AdViewer {
  loggedIn: boolean;
  isPro: boolean;
  isAdmin: boolean;
}

/** Người này có được xem quảng cáo không (không phụ thuộc trang) */
export const viewerMayHaveAds = (config: AdsPublicConfig | null, viewer: AdViewer) => {
  if (!config || !config.enabled) return false;
  if (viewer.isPro || viewer.isAdmin) return false; // gói Pro không quảng cáo; admin không bao giờ
  if (!viewer.loggedIn && !config.guests) return false;
  return true;
};
