import { STATS_CONFIDENCE_HIGH_EXAMS, STATS_CONFIDENCE_MEDIUM_EXAMS, STATS_RECENCY_HALF_LIFE_DAYS, type StatsConfidence } from "../constants/frequency-stats";

// Phép tính của thống kê tần suất, viết thuần để test. Câu SQL trong frequency-stats.repository tính đúng các công thức này.

const DAY_MS = 86_400_000;

/** Chu kỳ bán rã phải là số dương; sai thì báo lỗi trước khi ghi gì. */
export function assertHalfLife(halfLifeDays: number) {
  if (!Number.isFinite(halfLifeDays) || halfLifeDays <= 0) throw new Error(`Half-life must be > 0 days, got ${halfLifeDays}`);
  return halfLifeDays;
}

/** Trọng số của một đề theo tuổi (ngày): 0.5 ^ (tuổi / chu kỳ bán rã). Đề mới nhất = 1; tuổi âm coi như 0. */
export const recencyWeight = (ageDays: number, halfLifeDays = STATS_RECENCY_HALF_LIFE_DAYS) => 0.5 ** (Math.max(0, ageDays) / halfLifeDays);

/** Tuổi của đề tính từ đề mới nhất của môn (không phụ thuộc giờ chạy lệnh nên chạy lại vẫn ra cùng số). */
export const ageDays = (examAt: Date, newest: Date) => (newest.getTime() - examAt.getTime()) / DAY_MS;

/**
 * Điểm gần đây trong [0, 1]: tổng trọng số các đề có chương/nhóm này chia tổng trọng số mọi đề của môn.
 * Có ở mọi đề = 1; chỉ có ở đề cũ thì nhỏ hơn chỉ có ở đề mới dù cùng số đề.
 */
export function recencyScore(examDates: readonly Date[], containing: readonly number[], halfLifeDays = STATS_RECENCY_HALF_LIFE_DAYS) {
  if (examDates.length === 0) return 0;
  const newest = new Date(Math.max(...examDates.map((d) => d.getTime())));
  const weights = examDates.map((d) => recencyWeight(ageDays(d, newest), halfLifeDays));
  const total = weights.reduce((s, w) => s + w, 0);
  const hit = [...new Set(containing)].reduce((s, i) => s + (weights[i] ?? 0), 0);
  return total > 0 ? hit / total : 0;
}

export const confidenceOf = (totalExams: number, medium = STATS_CONFIDENCE_MEDIUM_EXAMS, high = STATS_CONFIDENCE_HIGH_EXAMS): StatsConfidence =>
  totalExams >= high ? "high" : totalExams >= medium ? "medium" : "low";
