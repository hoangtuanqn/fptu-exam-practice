// Gói Pro: một cấp duy nhất. Trả một lần, dùng đủ số tháng; mua khi còn hạn thì cộng dồn.
export const PRO_PLAN = {
  code: "PRO",
  name: "Pro",
  months: 4,
  price: 99_000, // credit (1 credit = 1đ)
  fuoPrice: 192_000, // giá mua trực tiếp gói VIP trên FuOverflow cho cùng thời hạn, dùng để tính mức tiết kiệm
} as const;

// Gói Nước rút: cùng quyền lợi Pro nhưng ngắn hạn và rẻ, cho người chỉ cần ôn gấp trước kỳ thi
export const SPRINT_PLAN = {
  code: "SPRINT",
  name: "Pro Nước rút",
  days: 14,
  price: 29_000, // credit (1 credit = 1đ)
} as const;

export const PLAN_CODES = ["PRO", "SPRINT"] as const;
export type PlanCode = (typeof PLAN_CODES)[number];

// Quyền lợi của Pro (bật/tắt từng mục ở đây; giao diện đọc từ /plan nên luôn khớp)
export const PRO_BENEFITS = {
  freeFetch: true, // lấy đề FuOverflow không bị trừ phí
  freeExplain: true, // xem giải thích AI mọi câu không bị trừ phí
  freePe: true, // tải bộ tài nguyên đề PE không bị trừ phí
  topicReport: true, // báo cáo điểm mạnh/yếu đầy đủ theo chủ đề và luyện đúng phần yếu (gói thường chỉ thấy chủ đề yếu nhất)
  frequentQuestions: true, // xem toàn bộ "Câu hay ra" của môn (gói thường chỉ xem FREQUENT_FREE_LIMIT câu đầu)
  unlimitedReview: true, // Sổ câu sai không giới hạn số câu (gói thường tối đa REVIEW_FREE_LIMIT)
} as const;

// Vé Pro: mua trước, người dùng tự kích hoạt sau. Hết hạn mà chưa kích hoạt thì không dùng được nữa (hạn được hiện rõ lúc mua).
export const TICKET_VALID_DAYS = 180;
export const TICKET_MAX_OPEN = 5; // số vé chưa kích hoạt tối đa mỗi tài khoản (chặn mua tích trữ quá nhiều một lúc)

// Lời mời Pro dựa trên dữ liệu thật của người dùng
export const NUDGE_EXAM_WINDOW_DAYS = 45; // chỉ nhắc khi kỳ thi còn trong chừng này ngày
export const NUDGE_SPEND_WINDOW_DAYS = 30; // tổng chi lẻ tính trong chừng này ngày gần nhất
export const NUDGE_MIN_SPEND = 20_000; // chi lẻ từ mức này (credit) trở lên mới so sánh với Pro
