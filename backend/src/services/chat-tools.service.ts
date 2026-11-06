import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../configs/prisma";
import { AppError } from "../rules/error";
import { fuoCatalogService, FuoSubjectNotFound, normalizeSubject } from "./crawler/fuo-catalog.service";

/**
 * Công cụ CHỈ ĐỌC cho chatbot, để trả lời "bài thi làm dở của tôi", "lịch sử nạp của tôi"...
 *
 * An toàn:
 * - Mọi công cụ nhận `userId` từ phiên đăng nhập ở máy chủ, KHÔNG nhận từ Claude: Claude không thể xem tài khoản khác dù bị dụ.
 * - Công cụ tra cứu (get_my_data) chỉ đọc, mỗi lần trả tối đa vài dòng, đã bỏ trường nhạy cảm.
 * - Khách chưa đăng nhập chỉ có find_fuo_exams (dữ liệu công khai của FuOverflow).
 * - Dữ liệu trả về (tên đề, ghi chú giao dịch...) là DỮ LIỆU, không phải mệnh lệnh: prompt hệ thống dặn Claude như vậy.
 */

// MỘT công cụ với tham số `what` thay vì 9 công cụ riêng: định nghĩa gọn hơn nhiều (mỗi lượt đều phải gửi kèm), kết quả như nhau
const ACCOUNT_TOOLS: Anthropic.Tool[] = [
  {
    name: "get_my_data",
    description:
      "The user's own data. what: summary (balance, verified, referral, counts) | exams (library; search) | in_progress | attempts (scores) | deposits (status) | wallet (credit history) | pe_downloads | unlocks (explanations bought, trials) | reports (answer reports) | gift_codes | stats (avg/best score, study time).",
    input_schema: {
      type: "object",
      properties: {
        what: { type: "string", enum: ["summary", "exams", "in_progress", "attempts", "deposits", "wallet", "pe_downloads", "unlocks", "reports", "gift_codes", "stats"] },
        search: { type: "string", description: "exams: title part" },
        status: { type: "string", enum: ["PENDING", "PAID", "EXPIRED"], description: "deposits" },
        limit: { type: "integer", minimum: 1, maximum: 10, description: "default 5" },
      },
      required: ["what"],
    },
  },
];

const FUO_TOOL: Anthropic.Tool = {
  name: "find_fuo_exams",
  description:
    "Live exam threads on FuOverflow for one subject code (e.g. PRO192), newest first. kind: FE final / PE practical. term: words in title (SU26, FA25, B5, Paper 3).",
  input_schema: {
    type: "object",
    properties: {
      subject: { type: "string", description: "e.g. PRO192" },
      kind: { type: "string", enum: ["FE", "PE", "ALL"], description: "default ALL" },
      term: { type: "string", description: "title words" },
      limit: { type: "integer", minimum: 1, maximum: 15, description: "default 10" },
      offset: { type: "integer", minimum: 0, description: "skip N (show more)" },
    },
    required: ["subject"],
  },
};

/** Công cụ theo người đang chat: thành viên có tra cứu dữ liệu của mình + tra đề FuOverflow, khách chỉ tra danh sách đề FuOverflow. */
export const chatToolsFor = (userId: number | null): Anthropic.Tool[] => (userId === null ? [FUO_TOOL] : [...ACCOUNT_TOOLS, FUO_TOOL]);

// Câu "đang làm gì" hiện cho người dùng trong lúc công cụ chạy
const STATUS: Record<string, string> = {
  gift_codes: "Đang xem các giftcode bạn đã nhập…",
  stats: "Đang tổng hợp thống kê làm bài của bạn…",
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
export function toolStatus(name: string, input: unknown) {
  if (name === "find_fuo_exams") return "Đang tìm đề trên FuOverflow (có thể mất vài giây)…";
  return STATUS[(input as { what?: string } | null)?.what ?? ""] ?? "Đang tra cứu…";
}

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
  gift_codes: "list_gift_codes",
  stats: "get_stats",
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

  async list_gift_codes(userId, input) {
    const rows = await prisma.giftCodeRedemption.findMany({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: take(input), select: { amount: true, createdAt: true, giftCode: { select: { code: true } } } });
    return rows.map((r) => ({ code: r.giftCode.code, amountCredit: r.amount, at: iso(r.createdAt) }));
  },

  async get_stats(userId) {
    const [agg, best, byMode] = await Promise.all([
      prisma.examAttempt.aggregate({ where: { userId }, _count: { _all: true }, _avg: { score: true }, _max: { score: true }, _sum: { durationSec: true, correct: true, wrong: true } }),
      prisma.examAttempt.findFirst({ where: { userId }, orderBy: [{ score: "desc" }, { id: "desc" }], select: { exam: { select: { title: true } } } }),
      prisma.examAttempt.groupBy({ by: ["mode"], where: { userId }, _count: { _all: true }, _avg: { score: true } }),
    ]);
    const r2 = (n: unknown) => (n === null || n === undefined ? null : Number(Number(n).toFixed(2)));
    return {
      attempts: agg._count._all,
      avgScore10: r2(agg._avg.score),
      bestScore10: r2(agg._max.score),
      bestExam: best?.exam.title ?? null,
      totalMinutes: Math.round((agg._sum.durationSec ?? 0) / 60),
      correctAnswers: agg._sum.correct ?? 0,
      wrongAnswers: agg._sum.wrong ?? 0,
      byMode: byMode.map((m) => ({ mode: m.mode === "EXAM" ? "Thi" : "Luyện tập", attempts: m._count._all, avgScore10: r2(m._avg.score) })),
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

// ---- find_fuo_exams
const KIND_PREFIX: Record<string, RegExp> = { FE: /\bFE\b/i, PE: /\bPE\b/i };

async function findFuoExams(input: Record<string, unknown>) {
  const subject = normalizeSubject(String(input.subject ?? ""));
  if (!subject) return { error: "Mã môn không hợp lệ (ví dụ PRO192)" };
  let data;
  try {
    data = await fuoCatalogService.examsOf(subject);
  } catch (err) {
    if (err instanceof FuoSubjectNotFound) return { error: `FuOverflow không có môn ${subject}. Kiểm tra lại mã môn.` };
    console.error(`[chat-tool] find_fuo_exams ${subject}: ${(err as Error).message}`);
    return { error: "Không đọc được FuOverflow lúc này, bạn thử lại sau nhé" };
  }
  const kind = String(input.kind ?? "ALL").toUpperCase();
  const words = (typeof input.term === "string" ? input.term : "").toLowerCase().split(/\s+/).filter(Boolean).slice(0, 6);
  const matches = data.threads.filter((t) => {
    if (kind in KIND_PREFIX && !KIND_PREFIX[kind]!.test(`${t.prefix} ${t.title}`)) return false;
    const hay = t.title.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
  const limit = Number.isInteger(Number(input.limit)) ? Math.min(15, Math.max(1, Number(input.limit))) : 10;
  const offset = Number.isInteger(Number(input.offset)) ? Math.max(0, Number(input.offset)) : 0;
  const counts: Record<string, number> = {};
  for (const t of data.threads) counts[t.prefix || "Khác"] = (counts[t.prefix || "Khác"] ?? 0) + 1;
  return {
    subject,
    forum: data.forumUrl,
    total: data.threads.length,
    byType: counts,
    matched: matches.length,
    from: offset + 1,
    ...(data.truncated && { note: "list cut at 15 pages" }),
    // dạng gọn cho ít token: [tiêu đề, loại, ngày đăng, link]
    items: matches.slice(offset, offset + limit).map((t) => [t.title, t.prefix || "Khác", t.postedAt?.slice(0, 10) ?? null, t.url]),
  };
}

/** Chạy một công cụ. Lỗi hay tên lạ trả về thông báo ngắn để Claude nói lại với người dùng, không làm hỏng cuộc trò chuyện. */
export async function runChatTool(userId: number | null, name: string, input: unknown): Promise<string> {
  const args = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  try {
    if (name === "find_fuo_exams") return JSON.stringify(await findFuoExams(args));
    if (userId === null) return JSON.stringify({ error: "Cần đăng nhập để dùng chức năng này" });
    const run = name === "get_my_data" ? RUNNERS[WHAT[String(args.what)] ?? ""] : undefined;
    if (!run) return JSON.stringify({ error: "Không có loại dữ liệu này" });
    const data = await run(userId, args);
    return JSON.stringify(Array.isArray(data) && data.length === 0 ? { items: [], note: "Không có dữ liệu" } : data);
  } catch (err) {
    if (err instanceof AppError) return JSON.stringify({ error: err.message });
    console.error(`[chat-tool] ${name} ${String(args.what ?? args.action ?? "")}: ${(err as Error).message}`);
    return JSON.stringify({ error: "Không thực hiện được lúc này" });
  }
}
