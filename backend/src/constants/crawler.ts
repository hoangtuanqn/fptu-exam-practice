// Cấu hình mở đề (lưu ở bảng settings, khoá "crawler.<tên>")
export interface CrawlerConfig {
  fetchPrice: number; // phí (credit) mỗi lần mở một đề chưa có trong kho, 0 = miễn phí
}

export const CRAWLER_DEFAULTS: CrawlerConfig = {
  fetchPrice: 0,
};

export const CRAWLER_KEY_PREFIX = "crawler.";

// Thư mục của một đề trong STORAGE_DIR: exams/<threadId>/ gồm images/<tên>.webp và comments.txt
export const EXAM_STORAGE_DIR = "exams";
export const EXAM_IMAGES_DIR = "images";
// Tệp đính kèm không phải ảnh (pdf, zip, video...): lưu nguyên bản ở exams/<threadId>/files/
export const EXAM_FILES_DIR = "files";
