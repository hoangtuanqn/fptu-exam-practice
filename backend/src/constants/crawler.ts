export interface CrawlerConfig {
  cookie: string; // cookie đăng nhập FuOverflow (ảnh gốc yêu cầu đăng nhập)
  loginEmail: string; // tài khoản FuOverflow để tự đăng nhập lấy cookie mới khi phiên hết hạn
  loginPassword: string; // không bao giờ trả ra giao diện
  loginLastAt: string; // lần đăng nhập tự động gần nhất (ISO), rỗng = chưa có
  loginLastError: string; // lỗi của lần đó, rỗng = thành công
  userAgent: string; // phải trùng User-Agent của trình duyệt đã lấy cookie
  referer: string;
  requestDelayMs: number; // nghỉ giữa các request liên tiếp của cùng một luồng để không bị chặn
  concurrency: number; // số request tải ảnh/bình luận chạy cùng lúc (1 = lần lượt)
  webpQuality: number; // chất lượng WebP khi chuyển ảnh
  fetchPrice: number; // phí (VND) mỗi lần lấy đề từ FuOverflow, 0 = miễn phí
}

export const CRAWLER_DEFAULTS: CrawlerConfig = {
  cookie: "",
  loginEmail: "",
  loginPassword: "",
  loginLastAt: "",
  loginLastError: "",
  userAgent: "",
  referer: "https://fuoverflow.com/",
  requestDelayMs: 300,
  concurrency: 4,
  webpQuality: 80,
  fetchPrice: 0,
};

export const CRAWLER_KEY_PREFIX = "crawler.";

export const FUO_HOST = "fuoverflow.com";

// Đáp án tạm cho mọi câu cho tới khi có logic xác định đáp án đúng từ bình luận

// Thư mục của một đề trong STORAGE_DIR: exams/<threadId>/ gồm images/<tên>.webp và comments.txt
export const EXAM_STORAGE_DIR = "exams";
export const EXAM_IMAGES_DIR = "images";
