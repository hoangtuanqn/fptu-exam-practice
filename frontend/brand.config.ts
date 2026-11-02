// NƠI DUY NHẤT định nghĩa tên và thông tin thương hiệu.
// Muốn đổi: sửa giá trị mặc định ở đây, hoặc đặt biến VITE_* trong frontend/.env (xem .env.example).
// File này dùng chung cho cả giao diện (src/config/brand.ts) lẫn <head> của index.html (vite.config.ts).

export interface Brand {
  company: string; // tên công ty, hiện ở logo, footer, tiêu đề tab
  product: string; // tên sản phẩm
  tagline: string;
  description: string; // mô tả cho SEO và khi chia sẻ link
  siteUrl: string; // địa chỉ website thật (để trống nếu chưa có); dùng cho ảnh bìa khi chia sẻ
  companyUrl: string; // trang chủ công ty (tuỳ chọn); không có thì liên kết về Facebook
  facebookUrl: string; // fanpage công ty
  founder: string; // người sáng lập, hiện ở footer
  coFounders: string[]; // đồng sáng lập (VITE_CO_FOUNDERS, cách nhau bằng dấu phẩy)
  themeColor: string; // màu thanh trình duyệt trên điện thoại
  title: string; // tiêu đề tab, ghép từ product + company
}

type Env = Record<string, string | undefined>;

const DEFAULTS = {
  company: "MST Software",
  product: "Luyện thi FE FPTU",
  tagline: "MMO Solution",
  description: "Luyện thi FE FPTU: làm đề trắc nghiệm từ thư mục ảnh, chấm điểm thang 10. Phát triển bởi MST Software.",
  siteUrl: "",
  companyUrl: "",
  facebookUrl: "https://facebook.com/mstsoftware.vn",
  founder: "Phạm Hoàng Tuấn",
  coFounders: "Vũ Việt Quang, Mai Trung Hậu",
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
    description: pick("VITE_APP_DESCRIPTION", DEFAULTS.description),
    siteUrl: pick("VITE_SITE_URL", DEFAULTS.siteUrl).replace(/\/$/, ""),
    companyUrl: pick("VITE_COMPANY_URL", DEFAULTS.companyUrl),
    facebookUrl: pick("VITE_FACEBOOK_URL", DEFAULTS.facebookUrl),
    founder: pick("VITE_FOUNDER", DEFAULTS.founder),
    coFounders: pick("VITE_CO_FOUNDERS", DEFAULTS.coFounders)
      .split(",")
      .map((n) => n.trim())
      .filter(Boolean),
    themeColor: pick("VITE_THEME_COLOR", DEFAULTS.themeColor),
    title: `${product} | ${company}`,
  };
}
