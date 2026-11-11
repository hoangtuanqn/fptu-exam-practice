// Thống kê tần suất ra đề theo chương và theo nhóm câu (npm run stats:refresh). Chỉ là số liệu quá khứ, không phải dự đoán.

// Đề cũ hơn đề mới nhất của môn chừng này ngày thì chỉ còn nửa trọng số (trọng số = 0.5 ^ (tuổi / chu kỳ bán rã))
export const STATS_RECENCY_HALF_LIFE_DAYS = 730;

// Độ tin cậy theo tổng số đề của môn: ít hơn MEDIUM là "low", từ HIGH trở lên là "high"
export const STATS_CONFIDENCE_MEDIUM_EXAMS = 5;
export const STATS_CONFIDENCE_HIGH_EXAMS = 15;
export const STATS_CONFIDENCE_LEVELS = ["low", "medium", "high"] as const;
export type StatsConfidence = (typeof STATS_CONFIDENCE_LEVELS)[number];

// Danh sách nhóm câu hay ra: mặc định và tối đa mỗi lần gọi; chỉ nhóm có mặt ở từ chừng này đề trở lên mới vào danh sách
export const HOT_QUESTIONS_DEFAULT_LIMIT = 20;
export const HOT_QUESTIONS_MAX_LIMIT = 100;
export const HOT_QUESTIONS_MIN_EXAMS = 2;
export const CHAPTER_STATS_MAX_ROWS = 200; // một môn có vài chục chương; chặn trên cho chắc

// Làm mới một môn trong một giao dịch
export const STATS_TX_TIMEOUT_MS = 60_000;
