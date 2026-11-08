// Người dùng đang trong thời hạn Pro?
export const isProUntil = (proExpiresAt: Date | null | undefined, now = new Date()) => !!proExpiresAt && proExpiresAt.getTime() > now.getTime();
