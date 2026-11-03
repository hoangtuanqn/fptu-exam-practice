// 1500000 -> "1.500.000 ₫"
export const formatMoney = (n: number) => `${n.toLocaleString("vi-VN")} ₫`;

// Giờ Việt Nam, bất kể múi giờ của máy chủ: "03/11/2026 14:05"
export const formatDateTimeVN = (d: Date) =>
  d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });
