// Huy hiệu: chỉ để ghi nhận, không thưởng credit/vé Pro, không có bảng xếp hạng công khai.
// Định nghĩa nằm trong code; DB (user_badges) chỉ lưu cấp cao nhất đã đạt và ghim.

// Số đo lấy từ dữ liệu thật của người dùng (badge.repository.counters)
export type BadgeMetric =
  | "verified" // 1 khi đã xác minh email
  | "attempts" // số bài đã nộp
  | "highScores" // số bài đạt từ BADGE_HIGH_SCORE trở lên (bài có ít nhất BADGE_SCORE_MIN_QUESTIONS câu)
  | "perfectScores" // số bài đạt BADGE_PERFECT_SCORE
  | "longestStreak" // chuỗi điểm danh dài nhất
  | "reviewDays" // số ngày có ôn tập (Sổ câu sai hoặc lịch ôn FSRS)
  | "contributions" // đóng góp đề được duyệt
  | "confirmedReports" // báo cáo đáp án được admin xác nhận
  | "referrals" // người được giới thiệu đã đăng ký và xác minh email
  | "proPurchases" // số lần mua/kích hoạt Pro
  | "proDays"; // tổng số ngày Pro đã mua

export type BadgeCategory = "start" | "exam" | "habit" | "community" | "membership";

export interface BadgeTier {
  level: 1 | 2 | 3;
  threshold: number;
  label: string;
}

export interface BadgeDef {
  key: string;
  category: BadgeCategory;
  name: string;
  description: string;
  icon: string; // khoá ngắn, giao diện tự đổi sang biểu tượng
  metric: BadgeMetric;
  tiers: readonly BadgeTier[]; // tăng dần theo threshold
}

const single = (label = "Đã đạt"): BadgeTier[] => [{ level: 1, threshold: 1, label }];
const three = (a: number, b: number, c: number): BadgeTier[] => [
  { level: 1, threshold: a, label: "Đồng" },
  { level: 2, threshold: b, label: "Bạc" },
  { level: 3, threshold: c, label: "Vàng" },
];

export const BADGES: readonly BadgeDef[] = [
  { key: "welcome", category: "start", name: "Chào mừng", description: "Xác minh email tài khoản", icon: "mail-check", metric: "verified", tiers: single() },
  { key: "first_exam", category: "start", name: "Bài đầu tiên", description: "Nộp bài thi đầu tiên", icon: "flag", metric: "attempts", tiers: single() },
  { key: "exam_runner", category: "exam", name: "Chăm luyện đề", description: "Nộp nhiều bài thi", icon: "file-check", metric: "attempts", tiers: three(5, 25, 100) },
  { key: "high_scorer", category: "exam", name: "Điểm cao", description: "Đạt từ 8 điểm trở lên", icon: "trending-up", metric: "highScores", tiers: three(1, 5, 20) },
  { key: "perfect_ten", category: "exam", name: "Điểm 10", description: "Đạt điểm tuyệt đối", icon: "star", metric: "perfectScores", tiers: three(1, 3, 10) },
  { key: "streak", category: "habit", name: "Chuyên cần", description: "Điểm danh nhiều ngày liên tiếp", icon: "flame", metric: "longestStreak", tiers: three(3, 7, 30) },
  { key: "review_master", category: "habit", name: "Ôn tập đều đặn", description: "Số ngày có ôn lại câu hỏi", icon: "repeat", metric: "reviewDays", tiers: three(7, 30, 100) },
  { key: "contributor", category: "community", name: "Người đóng góp", description: "Đóng góp đề thi được duyệt", icon: "upload", metric: "contributions", tiers: three(1, 5, 20) },
  { key: "sharp_eye", category: "community", name: "Mắt tinh", description: "Báo cáo đáp án sai được xác nhận", icon: "eye", metric: "confirmedReports", tiers: three(1, 5, 20) },
  { key: "ambassador", category: "community", name: "Đại sứ", description: "Bạn bè đăng ký qua mã giới thiệu của bạn", icon: "users", metric: "referrals", tiers: three(1, 5, 20) },
  { key: "pro_member", category: "membership", name: "Thành viên Pro", description: "Sử dụng gói Pro", icon: "crown", metric: "proPurchases", tiers: single() },
  { key: "pro_loyal", category: "membership", name: "Pro lâu năm", description: "Tổng thời gian Pro đã mua từ 180 ngày", icon: "gem", metric: "proDays", tiers: [{ level: 1, threshold: 180, label: "Đã đạt" }] },
];

export const BADGE_KEYS = BADGES.map((b) => b.key);
export const BADGE_KEY_MAX = 40;
export const BADGE_PIN_MAX = 3; // số huy hiệu ghim tối đa trên hồ sơ
export const BADGE_HIGH_SCORE = 8;
export const BADGE_PERFECT_SCORE = 10;
// Huy hiệu điểm chỉ tính bài có từ chừng này câu (chặn lấy điểm 10 bằng bộ đề 1 câu)
export const BADGE_SCORE_MIN_QUESTIONS = 10;
export const BADGE_NOTICE_LINK = "/account/badges";
// Quét lại theo lô trong lệnh backfill
export const BADGE_BACKFILL_BATCH = 500;
