// Đề "dùng được" (đã có đáp án do AI giải hoặc chỉnh tay); đề DEFAULT (đáp án tạm) không tính vào thống kê.
// Cùng điều kiện với frequent-questions.service và review.service.
export const USABLE_ANSWER_SOURCES = ["AI", "MANUAL"] as const;
