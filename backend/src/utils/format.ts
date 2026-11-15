// 1500000 -> "1.500.000 ₫"
export const formatMoney = (n: number) => `${n.toLocaleString("vi-VN")} ₫`;

// 1500 -> "1.500 credit" (ví tính bằng credit, 1 ₫ chuyển khoản = 1 credit)
export const formatCredit = (n: number) => `${n.toLocaleString("vi-VN")} credit`;

// Thời gian chờ đọc được: "45 giây", "12 phút", "2 giờ 5 phút"
export const waitText = (ms: number) => {
  const s = Math.max(1, Math.ceil(ms / 1000));
  if (s < 60) return `${s} giây`;
  const m = Math.ceil(s / 60);
  if (m < 60) return `${m} phút`;
  return m % 60 ? `${Math.floor(m / 60)} giờ ${m % 60} phút` : `${m / 60} giờ`;
};

// Giờ Việt Nam, bất kể múi giờ của máy chủ: "03/11/2026 14:05"
export const formatDateTimeVN = (d: Date) =>
  d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });
