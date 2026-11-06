// NƠI DUY NHẤT định nghĩa tên và thông tin thương hiệu.
// Muốn đổi: sửa giá trị mặc định ở đây, hoặc đặt biến VITE_* trong frontend/.env (xem .env.example).
// File này dùng chung cho cả giao diện (src/config/brand.ts) lẫn <head> của index.html (vite.config.ts).

export interface Brand {
  company: string; // tên công ty, hiện ở logo, footer, tiêu đề tab
  product: string; // tên sản phẩm
  tagline: string; // khẩu hiệu công ty
  slogan: string; // khẩu hiệu của sản phẩm, hiện ở tiêu đề trang chủ
  description: string; // mô tả cho SEO và khi chia sẻ link
  siteUrl: string; // địa chỉ website thật (để trống nếu chưa có); dùng cho ảnh bìa khi chia sẻ
  companyUrl: string; // trang chủ công ty (tuỳ chọn); không có thì liên kết về Facebook
  facebookUrl: string; // fanpage công ty
  founder: string; // người sáng lập, hiện ở footer
  coFounders: string[]; // đồng sáng lập (VITE_CO_FOUNDERS, cách nhau bằng dấu phẩy)
  partnerName: string; // đối tác cung cấp kho đề
  partnerUrl: string;
  extensionUrl: string; // link tải file zip tiện ích Chrome (đặt file fepass_extension.zip vào frontend/public)
  themeColor: string; // màu thanh trình duyệt trên điện thoại
  title: string; // tiêu đề tab, ghép từ product + company
}

type Env = Record<string, string | undefined>;

const DEFAULTS = {
  company: "MST Software",
  product: "Luyện thi FE FPTU",
  tagline: "MMO Solution",
  slogan: "Hành trình đi đến điểm 10.",
  description: "Luyện thi FE FPTU: lấy đề FuOverflow bằng một link (500đ/đề, có đáp án AI), giải thích từng câu, chấm điểm thang 10, tải tài nguyên đề PE. Cài tiện ích Chrome để làm đề ngay trên FuOverflow. Đăng ký tặng credit.",
  siteUrl: "",
  companyUrl: "",
  facebookUrl: "https://facebook.com/mstsoftware.vn",
  founder: "Phạm Hoàng Tuấn",
  coFounders: "Vũ Việt Quang, Mai Trung Hậu",
  partnerName: "FuOverflow",
  partnerUrl: "https://fuoverflow.com",
  extensionUrl: "/fepass_extension.zip",
  themeColor: "#0b1730",
};

export function loadBrand(env: Env): Brand {
  const pick = (key: string, fallback: string) => env[key]?.trim() || fallback;

  const company = pick("VITE_COMPANY_NAME", DEFAULTS.company);
  const product = pick("VITE_APP_NAME", DEFAULTS.product);
  return {
    company,
    product,
    tagline: pick("VITE_APP_TAGLINE", DEFAULTS.tagline),
    slogan: pick("VITE_APP_SLOGAN", DEFAULTS.slogan),
    description: pick("VITE_APP_DESCRIPTION", DEFAULTS.description),
    siteUrl: pick("VITE_SITE_URL", DEFAULTS.siteUrl).replace(/\/$/, ""),
    companyUrl: pick("VITE_COMPANY_URL", DEFAULTS.companyUrl),
    facebookUrl: pick("VITE_FACEBOOK_URL", DEFAULTS.facebookUrl),
    founder: pick("VITE_FOUNDER", DEFAULTS.founder),
    coFounders: pick("VITE_CO_FOUNDERS", DEFAULTS.coFounders)
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean),
    partnerName: pick("VITE_PARTNER_NAME", DEFAULTS.partnerName),
    partnerUrl: pick("VITE_PARTNER_URL", DEFAULTS.partnerUrl),
    extensionUrl: pick("VITE_EXTENSION_URL", DEFAULTS.extensionUrl),
    themeColor: pick("VITE_THEME_COLOR", DEFAULTS.themeColor),
    title: `${product} | ${company}`,
  };
}
