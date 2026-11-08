// Gói Pro: một cấp duy nhất. Trả một lần, dùng đủ số tháng; mua khi còn hạn thì cộng dồn.
export const PRO_PLAN = {
  code: "PRO",
  name: "Pro",
  months: 4,
  price: 99_000, // credit (1 credit = 1đ)
  fuoPrice: 192_000, // giá mua trực tiếp gói VIP trên FuOverflow cho cùng thời hạn, dùng để tính mức tiết kiệm
} as const;

// Quyền lợi của Pro (bật/tắt từng mục ở đây; giao diện đọc từ /plan nên luôn khớp)
export const PRO_BENEFITS = {
  freeFetch: true, // lấy đề FuOverflow không bị trừ phí
  freeExplain: true, // xem giải thích AI mọi câu không bị trừ phí
  freePe: true, // tải bộ tài nguyên đề PE không bị trừ phí
  topicReport: true, // báo cáo điểm mạnh/yếu đầy đủ theo chủ đề và luyện đúng phần yếu (gói thường chỉ thấy chủ đề yếu nhất)
  unlimitedReview: true, // Sổ câu sai không giới hạn số câu (gói thường tối đa REVIEW_FREE_LIMIT)
} as const;
