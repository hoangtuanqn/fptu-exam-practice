// NƠI DUY NHẤT định nghĩa tên và thông tin thương hiệu.
// Muốn đổi: sửa giá trị mặc định ở đây, hoặc đặt biến VITE_* trong frontend/.env (xem .env.example).
// File này dùng chung cho cả giao diện (src/config/brand.ts) lẫn <head> của index.html (vite.config.ts).

export interface Brand {
  company: string; // tên công ty, hiện ở logo, footer, tiêu đề tab
  product: string; // tên sản phẩm
  tagline: string;
  description: string; // mô tả cho SEO và khi chia sẻ link
  siteUrl: string; // địa chỉ website thật (để trống nếu chưa có); dùng cho ảnh bìa khi chia sẻ
  companyUrl: string; // trang chủ công ty; có thì footer hiện liên kết
  themeColor: string; // màu thanh trình duyệt trên điện thoại
  title: string; // tiêu đề tab, ghép từ product + company
}

type Env = Record<string, string | undefined>;

const DEFAULTS = {
  company: "MST Software",
  product: "Luyện đề",
  tagline: "MMO Solution",
  description: "Luyện đề trắc nghiệm từ thư mục ảnh, chấm điểm thang 10, nạp tiền nhanh. Phát triển bởi MST Software.",
  siteUrl: "",
  companyUrl: "",
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
    themeColor: pick("VITE_THEME_COLOR", DEFAULTS.themeColor),
    title: `${product} | ${company}`,
  };
}
