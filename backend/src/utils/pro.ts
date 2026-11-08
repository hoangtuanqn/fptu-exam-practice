import { PRO_BENEFITS } from "../constants/plan";

// Người dùng đang trong thời hạn Pro?
// Dùng cho bộ giới hạn tốc độ: Pro không bị giới hạn lượt (lấy đề, tải PE)
export const isProUser = (user: unknown) => !!user && isProUntil((user as { proExpiresAt?: Date | null }).proExpiresAt);

// Pro và quyền lợi Sổ câu sai không giới hạn đang bật
export const hasUnlimitedReview = (user: unknown) => PRO_BENEFITS.unlimitedReview && isProUser(user);

// Pro và quyền lợi báo cáo chủ đề đang bật
export const hasTopicReport = (user: unknown) => PRO_BENEFITS.topicReport && isProUser(user);

export const isProUntil = (proExpiresAt: Date | null | undefined, now = new Date()) => !!proExpiresAt && proExpiresAt.getTime() > now.getTime();
