// 1500000 -> "1.500.000 ₫"
export const formatMoney = (n: number) => `${n.toLocaleString("vi-VN")} ₫`;

// 1500 -> "1.500 credit" (ví tính bằng credit, 1 ₫ chuyển khoản = 1 credit)
export const formatCredit = (n: number) => `${n.toLocaleString("vi-VN")} credit`;

// Giờ Việt Nam, bất kể múi giờ của máy chủ: "03/11/2026 14:05"
export const formatDateTimeVN = (d: Date) =>
  d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });
