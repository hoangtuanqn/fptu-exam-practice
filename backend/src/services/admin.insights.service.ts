import { prisma } from "../configs/prisma";
import { AppError } from "../rules/error";
import { fileUrlOf } from "../utils/file-url";
import { DAY_MS } from "../utils/time";
import type { GradedQuestion } from "./grading.service";

// Từ chừng này lượt trả lời trở lên mới đủ tin cậy để kết luận một câu "nhiều người sai" hay "đáp án có thể sai"
export const MIN_SAMPLE = 10;
// Lấy tối đa chừng này bài làm gần nhất của một đề để thống kê (mỗi người chỉ tính bài mới nhất)
const MAX_ATTEMPTS = 1500;

const count = (rows: { status: string; _count: { _all: number } }[], status: string) => rows.find((r) => r.status === status)?._count._all ?? 0;

// Rút gọn thông báo lỗi để gom các lỗi giống nhau (bỏ số và khoảng trắng thừa)
const normalizeError = (e: string) => e.replace(/\d+/g, "#").replace(/\s+/g, " ").trim().slice(0, 90);

export const adminInsightsService = {
  /**
   * Phễu người dùng: trong số người đăng ký trong N ngày gần đây, bao nhiêu người đi tới từng bước.
   * Kèm tỷ lệ lấy đề lỗi, lệnh nạp bị bỏ, lượt làm bài bỏ dở, và các lỗi lấy đề hay gặp nhất.
   */
  async funnel(days: number) {
    const now = Date.now();
    const since = new Date(now - days * DAY_MS);
    const cohort = { role: "USER" as const, createdAt: { gte: since } };

    const [registered, verified, fetched, attempted, deposited, pro, jobs, orders, started, submitted, abandoned, failedJobs] = await Promise.all([
      prisma.user.count({ where: cohort }),
      prisma.user.count({ where: { ...cohort, emailVerifiedAt: { not: null } } }),
      countFetched(cohort),
      prisma.user.count({ where: { ...cohort, attempts: { some: {} } } }),
      prisma.user.count({ where: { ...cohort, depositOrders: { some: { status: "PAID" } } } }),
      prisma.user.count({ where: { ...cohort, planPurchases: { some: {} } } }),
      prisma.crawlJob.groupBy({ by: ["status"], where: { createdAt: { gte: since }, refresh: false }, _count: { _all: true } }),
      prisma.depositOrder.groupBy({ by: ["status"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
      prisma.practiceSession.count({ where: { createdAt: { gte: since }, userId: { not: null } } }),
      prisma.practiceSession.count({ where: { createdAt: { gte: since }, userId: { not: null }, status: "SUBMITTED" } }),
      prisma.practiceSession.count({ where: { createdAt: { gte: since }, userId: { not: null }, status: "IN_PROGRESS", updatedAt: { lt: new Date(now - DAY_MS) } } }),
      prisma.crawlJob.findMany({ where: { createdAt: { gte: since }, refresh: false, status: "FAILED", error: { not: null } }, orderBy: { id: "desc" }, take: 300, select: { error: true } }),
    ]);

    const errors = new Map<string, number>();
    for (const j of failedJobs) {
      const key = normalizeError(j.error ?? "");
      if (key) errors.set(key, (errors.get(key) ?? 0) + 1);
    }
    const topErrors = [...errors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([message, n]) => ({ message, count: n }));

    return {
      days,
      steps: [
        { key: "registered", label: "Đăng ký tài khoản", count: registered },
        { key: "verified", label: "Xác minh email", count: verified },
        { key: "fetched", label: "Lấy được đề đầu tiên", count: fetched },
        { key: "attempted", label: "Nộp bài lần đầu", count: attempted },
        { key: "deposited", label: "Nạp tiền", count: deposited },
        { key: "pro", label: "Mua gói Pro", count: pro },
      ],
      crawl: { done: count(jobs, "DONE"), failed: count(jobs, "FAILED"), running: count(jobs, "RUNNING") + count(jobs, "QUEUED"), topErrors },
      deposits: { paid: count(orders, "PAID"), pending: count(orders, "PENDING"), expired: count(orders, "EXPIRED") },
      practice: { started, submitted, abandoned },
    };
  },

  /** Các đề cần chú ý: nhiều báo cáo đáp án chưa xử lý hoặc nhiều người làm (đáng kiểm tra chất lượng trước) */
  async examsToReview() {
    const [attempts, reports] = await Promise.all([
      prisma.examAttempt.groupBy({ by: ["examId"], _count: { _all: true }, orderBy: { _count: { examId: "desc" } }, take: 60 }),
      prisma.answerReport.groupBy({ by: ["examId", "status"], _count: { _all: true } }),
    ]);
    const stat = new Map<number, { attempts: number; pending: number; total: number }>();
    const get = (id: number) => stat.get(id) ?? stat.set(id, { attempts: 0, pending: 0, total: 0 }).get(id)!;
    for (const a of attempts) get(a.examId).attempts = a._count._all;
    for (const r of reports) {
      const s = get(r.examId);
      s.total += r._count._all;
      if (r.status === "PENDING") s.pending += r._count._all;
    }
    const ids = [...stat.keys()];
    const exams = await prisma.exam.findMany({ where: { id: { in: ids } }, select: { id: true, title: true, threadId: true, answerSource: true } });
    return exams
      .map((e) => ({ ...e, ...stat.get(e.id)! }))
      .sort((a, b) => b.pending - a.pending || b.attempts - a.attempts)
      .slice(0, 60);
  },

  /**
   * Chất lượng từng câu của một đề, tính từ bài làm của người dùng (mỗi người chỉ tính bài mới nhất).
   * "Đáp án có thể sai": đủ mẫu, và phương án được chọn nhiều nhất khác đáp án hiện tại với tỷ lệ từ một nửa trở lên.
   */
  async examQuestions(examId: number) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      select: {
        id: true,
        title: true,
        threadId: true,
        answerSource: true,
        questions: { where: { isReference: false }, orderBy: { number: "asc" }, select: { number: true, imagePath: true, answer: true } },
      },
    });
    if (!exam) throw AppError.notFound("Không tìm thấy đề");

    const [attempts, reports] = await Promise.all([
      prisma.examAttempt.findMany({ where: { examId }, orderBy: { id: "desc" }, take: MAX_ATTEMPTS, select: { userId: true, details: true } }),
      prisma.answerReport.groupBy({ by: ["questionNumber", "status"], where: { examId }, _count: { _all: true } }),
    ]);

    type Tally = { answered: number; wrong: number; picks: Map<string, number> };
    const tally = new Map<number, Tally>();
    const seen = new Set<number>();
    let users = 0;
    for (const a of attempts) {
      if (seen.has(a.userId)) continue; // chỉ lấy bài mới nhất của mỗi người để một người làm nhiều lần không làm lệch số liệu
      seen.add(a.userId);
      users++;
      for (const d of a.details as unknown as GradedQuestion[]) {
        if (d.outcome !== "correct" && d.outcome !== "wrong") continue;
        const t = tally.get(d.number) ?? tally.set(d.number, { answered: 0, wrong: 0, picks: new Map() }).get(d.number)!;
        t.answered++;
        if (d.outcome === "wrong") t.wrong++;
        const key = [...d.chosen].sort().join("");
        t.picks.set(key, (t.picks.get(key) ?? 0) + 1);
      }
    }

    const pending = new Map<number, number>();
    const totalReports = new Map<number, number>();
    for (const r of reports) {
      totalReports.set(r.questionNumber, (totalReports.get(r.questionNumber) ?? 0) + r._count._all);
      if (r.status === "PENDING") pending.set(r.questionNumber, r._count._all);
    }

    const questions = exam.questions.map((q) => {
      const t = tally.get(q.number);
      const answered = t?.answered ?? 0;
      const current = q.answer.split(/\s+/).filter(Boolean).sort().join("");
      let topKey = "";
      let topN = 0;
      for (const [k, n] of t?.picks ?? []) if (n > topN) [topKey, topN] = [k, n];
      const enough = answered >= MIN_SAMPLE;
      return {
        number: q.number,
        imageUrl: fileUrlOf(q.imagePath),
        answer: q.answer,
        answered,
        wrong: t?.wrong ?? 0,
        wrongRate: answered > 0 ? (t?.wrong ?? 0) / answered : 0,
        topPick: topKey ? topKey.split("").join(", ") : null,
        topPickShare: answered > 0 ? topN / answered : 0,
        suspicious: enough && !!topKey && topKey !== current && topN / answered >= 0.5,
        enoughSample: enough,
        reports: totalReports.get(q.number) ?? 0,
        pendingReports: pending.get(q.number) ?? 0,
      };
    });
    // Đáng ngờ trước, rồi tới tỷ lệ sai cao (chỉ xếp theo tỷ lệ khi đủ mẫu; câu thiếu mẫu xuống cuối)
    questions.sort((a, b) => Number(b.suspicious) - Number(a.suspicious) || Number(b.enoughSample) - Number(a.enoughSample) || b.wrongRate - a.wrongRate || a.number - b.number);

    return { exam: { id: exam.id, title: exam.title, threadId: exam.threadId, answerSource: exam.answerSource }, sampleUsers: users, minSample: MIN_SAMPLE, questions };
  },
};

// Số người đăng ký trong kỳ đã có ít nhất một lượt lấy đề thành công (CrawlJob chỉ lưu userId, không có quan hệ tới User)
async function countFetched(cohort: { role: "USER"; createdAt: { gte: Date } }) {
  const ids = (await prisma.user.findMany({ where: cohort, select: { id: true } })).map((u) => u.id);
  if (ids.length === 0) return 0;
  const rows = await prisma.crawlJob.findMany({ where: { status: "DONE", refresh: false, userId: { in: ids } }, distinct: ["userId"], select: { userId: true } });
  return rows.length;
}
