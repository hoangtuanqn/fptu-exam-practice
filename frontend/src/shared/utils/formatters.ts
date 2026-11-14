const money = new Intl.NumberFormat("vi-VN");

// 1500000 -> "1.500.000 ₫"
export const formatMoney = (n: number) => `${money.format(n)} ₫`;

// +50.000 ₫ / −20.000 ₫ (dùng cho lịch sử ví)
export const formatSigned = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${money.format(Math.abs(n))} ₫`;

// Ví tính bằng credit (1 ₫ chuyển khoản = 1 credit). ₫ chỉ dùng cho số tiền chuyển khoản ngân hàng.
export const formatCredit = (n: number) => `${money.format(n)} credit`;
export const formatCreditSigned = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${money.format(Math.abs(n))} credit`;

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

export const formatDate = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");

// 90 -> "1 giờ 30 phút", 2880 -> "2 ngày"
export const formatMinutes = (minutes: number) => {
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  return [d && `${d} ngày`, h && `${h} giờ`, m && `${m} phút`].filter(Boolean).join(" ") || "0 phút";
};

// Còn bao lâu tới mốc `iso` ("còn 2 giờ 5 phút", "còn dưới 1 phút", "đã hết hạn")
export const timeLeft = (iso: string, now = Date.now()) => {
  const minutes = Math.ceil((new Date(iso).getTime() - now) / 60_000);
  return minutes <= 0 ? "đã hết hạn" : `còn ${formatMinutes(minutes)}`;
};

// "Nguyễn Văn An" -> "NA"; dùng cho avatar chữ cái
export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
};

// 2048 -> "2 KB", 5_400_000 -> "5,1 MB"
export const formatBytes = (n: number) => {
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  return `${n.toLocaleString("vi-VN", { maximumFractionDigits: i > 1 ? 1 : 0 })} ${units[i]}`;
};
