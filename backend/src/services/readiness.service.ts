import { prisma } from "../configs/prisma";
import { subjectCodeFromTitle } from "../utils/subject-code";
import { userStatsCache } from "../utils/user-stats-cache";
import { topicStatsService } from "./topic-stats.service";

// Mức sẵn sàng theo từng môn, dựa trên các bài THI THỬ gần nhất. Cố ý không đưa phần trăm "khả năng qua môn": hệ thống không biết đề thi thật,
// nên chỉ cho một thang ba mức kèm số liệu để người học tự đánh giá.
export const READINESS_WINDOW = 5; // số bài thi thử gần nhất của mỗi môn được xét
export const READINESS_MIN_ATTEMPTS = 2; // ít hơn thì chưa kết luận
const MAX_SUBJECTS = 6;
const PASS_SCORE = 5; // điểm qua môn ở FPTU (thang 10)
const READY_SCORE = 7.5;
const READY_MAX_SPREAD = 1.5; // độ lệch chuẩn tối đa để coi là ổn định
const READY_MAX_WEAK = 1;
const TREND_DELTA = 1;

export type ReadinessLevel = "insufficient" | "needs-work" | "fair" | "ready";

export interface SubjectReadiness {
  code: string;
  level: ReadinessLevel;
  attempts: number; // số bài thi thử đã xét
  needed: number; // còn thiếu bao nhiêu bài thi thử để kết luận (0 nếu đã đủ)
  average: number | null;
  spread: number | null; // độ lệch chuẩn của điểm
  trend: "up" | "down" | "flat" | null;
  weakTopics: number; // số chủ đề đủ mẫu mà tỷ lệ đúng dưới 50%
  lastAt: string;
}

export function levelOf(average: number, spread: number, weakTopics: number): Exclude<ReadinessLevel, "insufficient"> {
  if (average < PASS_SCORE) return "needs-work";
  if (average >= READY_SCORE && spread <= READY_MAX_SPREAD && weakTopics <= READY_MAX_WEAK) return "ready";
  return "fair";
}

export const readinessService = {
  forUser(userId: number): Promise<SubjectReadiness[]> {
    return userStatsCache.readiness.wrap(userId, () => this.compute(userId));
  },

  async compute(userId: number): Promise<SubjectReadiness[]> {
    const rows = await prisma.examAttempt.findMany({
      where: { userId, mode: "EXAM", totalGraded: { gt: 0 } },
      orderBy: { id: "desc" },
      take: 80,
      select: { score: true, createdAt: true, exam: { select: { title: true } } },
    });

    const bySubject = new Map<string, { score: number; at: Date }[]>();
    for (const r of rows) {
      const code = subjectCodeFromTitle(r.exam.title);
      if (!code) continue;
      const list = bySubject.get(code) ?? bySubject.set(code, []).get(code)!;
      if (list.length < READINESS_WINDOW) list.push({ score: r.score, at: r.createdAt }); // mới nhất trước
    }
    if (bySubject.size === 0) return [];

    // Chủ đề yếu lấy từ báo cáo theo chủ đề (tính đủ cho mọi gói, ở đây chỉ dùng để đếm)
    const topics = await topicStatsService.forUser(userId, true).catch(() => null);
    const weakOf = (code: string) => topics?.subjects.find((s) => s.code === code)?.topics.filter((t) => t.enough && t.rate < 0.5).length ?? 0;

    return [...bySubject.entries()]
      .map(([code, list]): SubjectReadiness => {
        const n = list.length;
        const base = { code, attempts: n, weakTopics: weakOf(code), lastAt: list[0]!.at.toISOString() };
        if (n < READINESS_MIN_ATTEMPTS) return { ...base, level: "insufficient", needed: READINESS_MIN_ATTEMPTS - n, average: null, spread: null, trend: null };
        const scores = list.map((l) => l.score);
        const average = scores.reduce((a, b) => a + b, 0) / n;
        const spread = Math.sqrt(scores.reduce((a, b) => a + (b - average) ** 2, 0) / n);
        const diff = scores[0]! - scores[n - 1]!; // mới nhất so với cũ nhất trong khoảng xét
        return {
          ...base,
          level: levelOf(average, spread, base.weakTopics),
          needed: 0,
          average: Math.round(average * 10) / 10,
          spread: Math.round(spread * 10) / 10,
          trend: diff >= TREND_DELTA ? "up" : diff <= -TREND_DELTA ? "down" : "flat",
        };
      })
      .sort((a, b) => b.lastAt.localeCompare(a.lastAt))
      .slice(0, MAX_SUBJECTS);
  },
};
