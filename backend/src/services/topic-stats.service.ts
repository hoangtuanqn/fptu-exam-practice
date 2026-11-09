import { prisma } from "../configs/prisma";
import type { GradedQuestion } from "./grading.service";
import { subjectCodeFromTitle } from "../utils/subject-code";
import { userStatsCache } from "../utils/user-stats-cache";

// Một chủ đề cần ít nhất chừng này câu đã trả lời mới được kết luận mạnh/yếu (ít hơn thì chỉ hiện số liệu, không xếp hạng)
export const TOPIC_MIN_SAMPLE = 5;
const MAX_EXAMS = 200;

export interface TopicStat {
  topic: string;
  answered: number;
  correct: number;
  rate: number; // 0..1, tỷ lệ đúng
  enough: boolean; // đủ số câu để kết luận
}
export interface SubjectStats {
  code: string;
  topics: TopicStat[]; // yếu nhất trước (chủ đề chưa đủ mẫu xếp cuối)
}

/** Tỷ lệ đúng theo chủ đề của một người, tính từ bài làm MỚI NHẤT của mỗi đề (làm lại nhiều lần không làm lệch số liệu). */
async function compute(userId: number): Promise<SubjectStats[]> {
  return userStatsCache.topics.wrap(userId, () => computeUncached(userId));
}

async function computeUncached(userId: number) {
  const latest = await prisma.examAttempt.groupBy({ by: ["examId"], where: { userId }, _max: { id: true }, orderBy: { _max: { id: "desc" } }, take: MAX_EXAMS });
  const attemptIds = latest.map((l) => l._max.id!).filter(Boolean);
  if (attemptIds.length === 0) return [] as SubjectStats[];

  const [attempts, questions] = await Promise.all([
    prisma.examAttempt.findMany({ where: { id: { in: attemptIds } }, select: { examId: true, details: true, exam: { select: { title: true } } } }),
    prisma.examQuestion.findMany({ where: { examId: { in: latest.map((l) => l.examId) }, topic: { not: null }, isReference: false }, select: { examId: true, number: true, topic: true } }),
  ]);
  const topicOf = new Map(questions.map((q) => [`${q.examId}:${q.number}`, q.topic!]));

  const bySubject = new Map<string, Map<string, { answered: number; correct: number }>>();
  for (const a of attempts) {
    const code = subjectCodeFromTitle(a.exam.title);
    if (!code) continue;
    for (const d of a.details as unknown as GradedQuestion[]) {
      if (d.outcome !== "correct" && d.outcome !== "wrong") continue;
      const topic = topicOf.get(`${a.examId}:${d.number}`);
      if (!topic) continue;
      const topics = bySubject.get(code) ?? bySubject.set(code, new Map()).get(code)!;
      const t = topics.get(topic) ?? topics.set(topic, { answered: 0, correct: 0 }).get(topic)!;
      t.answered++;
      if (d.outcome === "correct") t.correct++;
    }
  }

  return [...bySubject.entries()]
    .map(([code, topics]) => ({
      code,
      topics: [...topics.entries()]
        .map(([topic, t]): TopicStat => ({ topic, answered: t.answered, correct: t.correct, rate: t.answered ? t.correct / t.answered : 0, enough: t.answered >= TOPIC_MIN_SAMPLE }))
        .sort((a, b) => Number(b.enough) - Number(a.enough) || a.rate - b.rate || b.answered - a.answered),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
}

export const topicStatsService = {
  /**
   * Gói thường: chỉ chủ đề yếu nhất (kèm số chủ đề đang bị khóa để mời nâng cấp). Pro: toàn bộ theo từng môn.
   * Việc khóa làm ở đây (máy chủ), không chỉ ẩn trên giao diện.
   */
  async forUser(userId: number, isPro: boolean) {
    const subjects = await compute(userId);
    const candidates = subjects.flatMap((s) => s.topics.filter((t) => t.enough).map((t) => ({ subject: s.code, ...t })));
    candidates.sort((a, b) => a.rate - b.rate || b.answered - a.answered);
    const weakest = candidates[0] ?? null;
    const totalTopics = subjects.reduce((n, s) => n + s.topics.length, 0);
    return { minSample: TOPIC_MIN_SAMPLE, weakest, totalTopics, locked: !isPro, subjects: isPro ? subjects : [] };
  },
};

export interface AttemptTopic {
  topic: string;
  correct: number;
  total: number; // số câu đã trả lời ở chủ đề này trong bài vừa nộp
}

/**
 * Kết quả theo chủ đề của CHÍNH bài vừa nộp (hiện ngay trong bảng điểm). Chủ đề có ít câu nhất cũng được hiện, vì đây là thống kê một bài chứ không phải kết luận dài hạn.
 * Gói thường chỉ nhận chủ đề yếu nhất (kèm số chủ đề còn lại để mời nâng cấp); Pro nhận đủ, xếp yếu nhất trước. Khóa ở máy chủ.
 */
export async function topicsOfAttempt(examId: number, items: GradedQuestion[], full: boolean) {
  const questions = await prisma.examQuestion.findMany({ where: { examId, topic: { not: null }, isReference: false }, select: { number: true, topic: true } });
  if (questions.length === 0) return { topics: [] as AttemptTopic[], hidden: 0 };
  const topicOf = new Map(questions.map((q) => [q.number, q.topic!]));
  const tally = new Map<string, AttemptTopic>();
  for (const d of items) {
    if (d.outcome !== "correct" && d.outcome !== "wrong") continue;
    const topic = topicOf.get(d.number);
    if (!topic) continue;
    const t = tally.get(topic) ?? tally.set(topic, { topic, correct: 0, total: 0 }).get(topic)!;
    t.total++;
    if (d.outcome === "correct") t.correct++;
  }
  const all = [...tally.values()].sort((a, b) => a.correct / a.total - b.correct / b.total || b.total - a.total);
  return full ? { topics: all, hidden: 0 } : { topics: all.slice(0, 1), hidden: Math.max(0, all.length - 1) };
}
