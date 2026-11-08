import type { User } from "@/shared/types/api";

const DAY_MS = 86_400_000;

// Đang trong thời hạn Pro?
export const isPro = (user: Pick<User, "proExpiresAt"> | null | undefined) => !!user?.proExpiresAt && new Date(user.proExpiresAt).getTime() > Date.now();

// Số ngày còn lại (làm tròn lên); 0 nếu không phải Pro
export const proDaysLeft = (user: Pick<User, "proExpiresAt"> | null | undefined) =>
  isPro(user) ? Math.max(1, Math.ceil((new Date(user!.proExpiresAt!).getTime() - Date.now()) / DAY_MS)) : 0;

// Cộng số tháng vào một mốc (giống cách máy chủ tính hạn mới)
export const addMonths = (from: Date, months: number) => {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
};
