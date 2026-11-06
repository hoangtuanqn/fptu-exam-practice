import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../configs/prisma";

/**
 * Công cụ CHỈ ĐỌC cho chatbot, để trả lời "bài thi làm dở của tôi", "lịch sử nạp của tôi"...
 *
 * An toàn:
 * - Mọi công cụ nhận `userId` từ phiên đăng nhập ở máy chủ, KHÔNG nhận từ Claude: Claude không thể xem tài khoản khác dù bị dụ.
 * - Chỉ đọc (không có công cụ nào ghi, trừ tiền, tạo lệnh...). Mỗi công cụ trả tối đa vài dòng, đã bỏ trường nhạy cảm.
 * - Khách chưa đăng nhập không có công cụ nào.
 * - Dữ liệu trả về (tên đề, ghi chú giao dịch...) là DỮ LIỆU, không phải mệnh lệnh: prompt hệ thống dặn Claude như vậy.
 */

// MỘT công cụ với tham số `what` thay vì 9 công cụ riêng: định nghĩa gọn hơn nhiều (mỗi lượt đều phải gửi kèm), kết quả như nhau
export const CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_my_data",
    description:
      "Read-only lookup of the chatting user's own data. what: summary (balance, email verified, join date, referral code/count, library and attempt counts) | exams (exam library; optional search) | in_progress (unfinished sessions) | attempts (submitted results with score) | deposits (deposit orders; optional status) | wallet (credit history) | pe_downloads | unlocks (explanation bundles, single purchases, free trials used) | reports (answer reports).",
    input_schema: {
      type: "object",
      properties: {
        what: { type: "string", enum: ["summary", "exams", "in_progress", "attempts", "deposits", "wallet", "pe_downloads", "unlocks", "reports"] },
        search: { type: "string", description: "exams only: part of the title" },
        status: { type: "string", enum: ["PENDING", "PAID", "EXPIRED"], description: "deposits only" },
        limit: { type: "integer", minimum: 1, maximum: 10, description: "default 5" },
      },
      required: ["what"],
    },
  },
];

// Câu "đang làm gì" hiện cho người dùng trong lúc công cụ chạy
const STATUS: Record<string, string> = {
  summary: "Đang xem thông tin tài khoản của bạn…",
  exams: "Đang xem kho đề của bạn…",
  in_progress: "Đang xem các bài bạn làm dở…",
  attempts: "Đang xem lịch sử làm bài của bạn…",
  deposits: "Đang xem lịch sử nạp của bạn…",
  wallet: "Đang xem biến động số dư của bạn…",
  pe_downloads: "Đang xem lịch sử tải đề PE của bạn…",
  unlocks: "Đang xem các lời giải bạn đã mở khóa…",
  reports: "Đang xem các báo cáo đáp án của bạn…",
};
export const toolStatus = (input: unknown) => STATUS[(input as { what?: string } | null)?.what ?? ""] ?? "Đang tra cứu…";

// what -> hàm chạy
const WHAT: Record<string, string> = {
  summary: "get_account_summary",
  exams: "list_my_exams",
  in_progress: "list_in_progress_sessions",
  attempts: "list_recent_attempts",
  deposits: "list_deposits",
  wallet: "list_wallet_transactions",
  pe_downloads: "list_pe_downloads",
  unlocks: "list_unlocked_explanations",
  reports: "list_answer_reports",
};

const take = (input: Record<string, unknown>) => {
  const n = Number(input.limit);
  return Number.isInteger(n) ? Math.min(10, Math.max(1, n)) : 5;
};
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null);

type Runner = (userId: number, input: Record<string, unknown>) => Promise<unknown>;

const RUNNERS: Record<string, Runner> = {
  async get_account_summary(userId) {
    const [u, exams, attempts, referred] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, balance: true, emailVerifiedAt: true, createdAt: true, referralCode: true } }),
      prisma.userExam.count({ where: { userId } }),
      prisma.examAttempt.count({ where: { userId } }),
      prisma.user.count({ where: { referredById: userId } }),
    ]);
    if (!u) return { error: "Không tìm thấy tài khoản" };
    return { fullName: u.fullName, balanceCredit: u.balance, emailVerified: !!u.emailVerifiedAt, joinedAt: iso(u.createdAt), referralCode: u.referralCode, referredCount: referred, examsInLibrary: exams, attemptsSubmitted: attempts };
  },

  async list_my_exams(userId, input) {
    const search = typeof input.search === "string" ? input.search.trim().slice(0, 100) : "";
    const rows = await prisma.userExam.findMany({
      where: { userId, ...(search && { exam: { title: { contains: search } } }) },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take(input),
      select: { createdAt: true, exam: { select: { title: true, threadId: true, totalQuestions: true, answerSource: true } } },
    });
    return rows.map((r) => ({ title: r.exam.title, questions: r.exam.totalQuestions, answerSource: r.exam.answerSource, addedAt: iso(r.createdAt), link: `/exam/${r.exam.threadId}` }));
  },

  async list_in_progress_sessions(userId, input) {
    const rows = await prisma.practiceSession.findMany({
      where: { userId, status: "IN_PROGRESS" },
      orderBy: { updatedAt: "desc" },
      take: take(input),
      select: { mode: true, answers: true, elapsedSec: true, updatedAt: true, exam: { select: { title: true, threadId: true, totalQuestions: true } } },
    });
    return rows.map((r) => ({
      exam: r.exam.title,
      mode: r.mode === "EXAM" ? "Thi" : "Luyện tập",
      answered: Object.values((r.answers ?? {}) as Record<string, string[]>).filter((a) => Array.isArray(a) && a.length > 0).length,
      totalQuestions: r.exam.totalQuestions,
      minutesSpent: Math.round(r.elapsedSec / 60),
      lastActiveAt: iso(r.updatedAt),
      link: `/exam/${r.exam.threadId}`,
    }));
  },

  async list_recent_attempts(userId, input) {
    const rows = await prisma.examAttempt.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take(input),
      select: { id: true, mode: true, score: true, correct: true, wrong: true, skipped: true, totalGraded: true, durationSec: true, createdAt: true, exam: { select: { title: true } } },
    });
    return rows.map((r) => ({ exam: r.exam.title, mode: r.mode === "EXAM" ? "Thi" : "Luyện tập", score10: Number(r.score.toFixed(2)), correct: r.correct, wrong: r.wrong, skipped: r.skipped, totalGraded: r.totalGraded, minutes: Math.round(r.durationSec / 60), submittedAt: iso(r.createdAt), link: `/account/attempts/${r.id}` }));
  },

  async list_deposits(userId, input) {
    const status = ["PENDING", "PAID", "EXPIRED"].includes(String(input.status)) ? (input.status as "PENDING" | "PAID" | "EXPIRED") : undefined;
    const rows = await prisma.depositOrder.findMany({
      where: { userId, status },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take(input),
      select: { code: true, amount: true, status: true, createdAt: true, paidAt: true, expiresAt: true },
    });
    return rows.map((r) => ({ code: r.code, amountVnd: r.amount, status: r.status === "PENDING" && r.expiresAt <= new Date() ? "EXPIRED" : r.status, createdAt: iso(r.createdAt), paidAt: iso(r.paidAt), link: `/account/deposit/${r.code}` }));
  },

  async list_wallet_transactions(userId, input) {
    const rows = await prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take(input),
      select: { type: true, amount: true, balanceAfter: true, note: true, createdAt: true },
    });
    return rows.map((r) => ({ type: r.type, amountCredit: r.amount, balanceAfter: r.balanceAfter, note: r.note?.slice(0, 80) ?? null, at: iso(r.createdAt) }));
  },

  async list_pe_downloads(userId, input) {
    const rows = await prisma.peDownload.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take(input),
      select: { title: true, price: true, status: true, files: true, createdAt: true },
    });
    return rows.map((r) => ({ title: r.title, priceCredit: r.price, status: r.status, files: r.files, at: iso(r.createdAt) }));
  },

  async list_unlocked_explanations(userId, input) {
    const [unlocks, singles, trials] = await Promise.all([
      prisma.explanationUnlock.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: take(input), select: { price: true, questions: true, createdAt: true, exam: { select: { title: true, threadId: true } } } }),
      prisma.explanationPurchase.groupBy({ by: ["examId"], where: { userId, isTrial: false }, _count: { _all: true }, orderBy: { _count: { examId: "desc" } }, take: take(input) }),
      prisma.explanationPurchase.count({ where: { userId, isTrial: true } }),
    ]);
    const titles = new Map((await prisma.exam.findMany({ where: { id: { in: singles.map((s) => s.examId) } }, select: { id: true, title: true } })).map((e) => [e.id, e.title]));
    return {
      bundlesBought: unlocks.map((u) => ({ exam: u.exam.title, questions: u.questions, priceCredit: u.price, at: iso(u.createdAt), link: `/exam/${u.exam.threadId}` })),
      singleExplanationsByExam: singles.map((s) => ({ exam: titles.get(s.examId) ?? `#${s.examId}`, questionsBought: s._count._all })),
      freeTrialsUsed: trials,
    };
  },

  async list_answer_reports(userId, input) {
    const rows = await prisma.answerReport.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: take(input),
      select: { questionNumber: true, proposedAnswer: true, status: true, reward: true, createdAt: true, exam: { select: { title: true } } },
    });
    return rows.map((r) => ({ exam: r.exam.title, question: r.questionNumber, proposedAnswer: r.proposedAnswer, status: r.status, rewardCredit: r.reward, at: iso(r.createdAt) }));
  },
};

/** Chạy một công cụ cho đúng người dùng. Lỗi hay tên lạ trả về thông báo ngắn để Claude nói lại với người dùng, không làm hỏng cuộc trò chuyện. */
export async function runChatTool(userId: number, name: string, input: unknown): Promise<string> {
  const args = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const run = name === "get_my_data" ? RUNNERS[WHAT[String(args.what)] ?? ""] : undefined;
  if (!run) return JSON.stringify({ error: "Không có loại dữ liệu này" });
  try {
    const data = await run(userId, args);
    return JSON.stringify(Array.isArray(data) && data.length === 0 ? { items: [], note: "Không có dữ liệu" } : data);
  } catch (err) {
    console.error(`[chat-tool] ${String(args.what)}: ${(err as Error).message}`);
    return JSON.stringify({ error: "Không tra cứu được lúc này" });
  }
}
