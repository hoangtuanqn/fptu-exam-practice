// Đề "dùng được" (đã có đáp án do AI giải hoặc chỉnh tay); đề DEFAULT (đáp án tạm) không tính vào thống kê.
// Cùng điều kiện với frequent-questions.service và review.service.
export const USABLE_ANSWER_SOURCES = ["AI", "MANUAL"] as const;

// Admin tải đề dạng .zip (dựng trong bộ nhớ mỗi lần tải): chặn đề bất thường
export const EXAM_ZIP_MAX_QUESTIONS = 500;
export const EXAM_ZIP_MAX_BYTES = 100 * 1024 * 1024;
