// Người dùng đang trong thời hạn Pro?
// Dùng cho bộ giới hạn tốc độ: Pro không bị giới hạn lượt (lấy đề, tải PE)
export const isProUser = (user: unknown) => !!user && isProUntil((user as { proExpiresAt?: Date | null }).proExpiresAt);

export const isProUntil = (proExpiresAt: Date | null | undefined, now = new Date()) => !!proExpiresAt && proExpiresAt.getTime() > now.getTime();
