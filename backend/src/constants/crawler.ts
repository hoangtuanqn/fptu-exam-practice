export interface CrawlerConfig {
  cookie: string; // cookie đăng nhập FuOverflow (ảnh gốc yêu cầu đăng nhập)
  userAgent: string; // phải trùng User-Agent của trình duyệt đã lấy cookie
  referer: string;
  requestDelayMs: number; // nghỉ giữa các request để không bị chặn
  webpQuality: number; // chất lượng WebP khi chuyển ảnh
  fetchPrice: number; // phí (VND) mỗi lần lấy đề từ FuOverflow, 0 = miễn phí
}

export const CRAWLER_DEFAULTS: CrawlerConfig = {
  cookie: "",
  userAgent: "",
  referer: "https://fuoverflow.com/",
  requestDelayMs: 300,
  webpQuality: 80,
  fetchPrice: 0,
};

export const CRAWLER_KEY_PREFIX = "crawler.";

export const FUO_HOST = "fuoverflow.com";

// Đáp án tạm cho mọi câu cho tới khi có logic xác định đáp án đúng từ bình luận
export const DEFAULT_ANSWER = "A";

// Thư mục của một đề trong STORAGE_DIR: exams/<threadId>/ gồm images/<tên>.webp và comments.txt
export const EXAM_STORAGE_DIR = "exams";
export const EXAM_IMAGES_DIR = "images";
