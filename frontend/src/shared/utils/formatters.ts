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

// "Nguyễn Văn An" -> "NA"; dùng cho avatar chữ cái
export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")).toUpperCase();
};
