// Phân tích slide (Pro): người dùng tải PDF slide của một môn, AI tóm tắt theo chương. Số liệu "chương hay ra" ghép lúc đọc từ chapter_stats.

// Giới hạn theo TỔNG token (vào + ra + ghi cache) Claude báo về, cộng dồn trong cửa sổ trượt mỗi người dùng
export const MATERIAL_FEATURE = "material"; // giá trị cột feature của ai_token_usage
export const MATERIAL_TOKENS_PER_WINDOW = 1_000_000;
export const MATERIAL_WINDOW_HOURS = 5;
export const MATERIAL_WINDOW_MS = MATERIAL_WINDOW_HOURS * 3600 * 1000;

// Tệp tải lên
export const MATERIAL_MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MATERIAL_MAX_FILE_MB = MATERIAL_MAX_FILE_BYTES / (1024 * 1024);
export const MATERIAL_MAX_PAGES = 120;
export const MATERIAL_PDF_MAGIC_WINDOW = 1024; // "%PDF-" phải nằm trong chừng này byte đầu (như trình đọc PDF thường chấp nhận)
export const MATERIAL_TITLE_MAX = 200;
export const MATERIAL_UPLOADS_PER_HOUR = 5; // mỗi tài khoản (chỉ đếm lần tải thành công)
export const MATERIAL_MAX_ACTIVE_PER_USER = 2; // số tài liệu đang chờ/đang chạy cùng lúc của một người
export const MATERIAL_LIST_MAX = 100; // danh sách "tài liệu của tôi" (tài liệu tự xoá sau MATERIAL_RETENTION_DAYS nên ít khi chạm)

// Tách trang
export const MATERIAL_PAGE_TEXT_MAX = 4000; // ký tự chữ lưu cho mỗi trang
export const MATERIAL_FIGURE_AREA_RATIO = 0.15; // ảnh chiếm hơn chừng này diện tích trang thì coi là trang hình
export const MATERIAL_SCANNED_MIN_CHARS = 30; // ít chữ hơn thế thì coi là trang scan (cần đọc bằng ảnh)
export const MATERIAL_RENDER_DPI = 100; // ~1000x750 cho slide 4:3, khoảng 1.65k token đầu vào mỗi ảnh

// Gọi AI (khoá và công tắc lấy từ cấu hình AI của trang quản trị)
export const MATERIAL_VISION_MODEL = "claude-haiku-5-5";
export const MATERIAL_FALLBACK_MODEL = "claude-sonnet-5-5"; // khi Haiku báo không chắc / có nhãn không đọc được
export const MATERIAL_TEXT_MODEL = "claude-haiku-5-5"; // gán chương và tóm tắt
export const MATERIAL_AI_TIMEOUT_MS = 2 * 60 * 1000;
export const MATERIAL_AI_MAX_RETRIES = 2;
export const MATERIAL_FIGURE_MAX_TOKENS = 1_500;
export const MATERIAL_ASSIGN_MAX_TOKENS = 2_000;
export const MATERIAL_CHAPTER_MAX_TOKENS = 4_000;
export const MATERIAL_VISION_CONCURRENCY = 2;
export const MATERIAL_ASSIGN_BATCH = 20; // số trang mỗi lần gán chương
export const MATERIAL_ASSIGN_SNIPPET = 300; // ký tự đầu của mỗi trang gửi khi gán chương
export const MATERIAL_CHAPTER_INPUT_MAX_CHARS = 60_000; // tổng chữ của một chương gửi đi khi tóm tắt (chia đều cho các trang)
export const MATERIAL_MAX_KEY_POINTS = 12;

// Ước lượng token để kiểm tra trước (không chính xác, chỉ để từ chối sớm khi chắc chắn không đủ)
export const MATERIAL_EST_TOKENS_PER_FIGURE = 2_500;
export const MATERIAL_EST_TOKENS_BASE = 3_000;
export const MATERIAL_EST_TOKENS_PER_PAGE = 600; // phần gán chương + tóm tắt tính theo số trang
// Trước MỖI lần gọi: còn ít hơn mức này thì dừng (một lần gọi có thể tốn chừng này)
export const MATERIAL_CALL_RESERVE_TOKENS = { figure: 2_500, assign: 8_000, chapter: 20_000 } as const;

// Lưu giữ
export const MATERIAL_RETENTION_DAYS = 30;
export const MATERIAL_CLEANUP_CRON = "30 4 * * *"; // 04:30 sau lượt thống kê ban đêm
export const MATERIAL_CLEANUP_TIMEZONE = "Asia/Ho_Chi_Minh";
// Dòng ai_token_usage cũ hơn chừng này bị cron dọn xoá (đã ra khỏi cửa sổ, chừa thêm 1 giờ).
// Sổ dùng chung: tính năng nào có cửa sổ dài hơn thì phải nâng mức này lên.
export const AI_TOKEN_USAGE_KEEP_MS = MATERIAL_WINDOW_MS + 60 * 60 * 1000;
export const MATERIAL_ORPHAN_FILE_MAX_AGE_MS = 60 * 60 * 1000; // tệp tạm không thuộc job đang chờ/chạy và cũ hơn chừng này thì xoá

export const MATERIAL_STATUSES = ["QUEUED", "RUNNING", "DONE", "FAILED"] as const;
export type MaterialStatusName = (typeof MATERIAL_STATUSES)[number];
export const PAGE_KINDS = ["text", "figure", "scanned"] as const;
export type PageKind = (typeof PAGE_KINDS)[number];
export const FIGURE_CONFIDENCE = ["high", "medium", "low"] as const;
export type FigureConfidence = (typeof FIGURE_CONFIDENCE)[number];
