import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { STEP_CYCLE_FACTOR } from "../constants/marketing";

export interface Recipient {
  id: number;
  email: string;
  fullName: string;
  proExpiresAt: Date | null;
}

// Ai được nhận thư marketing: thành viên thường, đang hoạt động, đã xác minh email, không từ chối nhận thư
const ELIGIBLE = Prisma.sql`u.role = 'USER' AND u.status = 'ACTIVE' AND u.email_verified_at IS NOT NULL AND u.marketing_opt_out = false`;

// Không có thư chiến dịch nào gửi từ `since` (giới hạn 1 thư / N ngày mỗi người)
const quietSince = (since: Date) => Prisma.sql`NOT EXISTS (SELECT 1 FROM email_campaign_logs l WHERE l.user_id = u.id AND l.sent_at >= ${since})`;

const notSent = (campaign: string, step: Prisma.Sql | number) =>
  Prisma.sql`NOT EXISTS (SELECT 1 FROM email_campaign_logs l WHERE l.user_id = u.id AND l.campaign = ${campaign} AND l.step = ${step})`;

/**
 * Lần hoạt động gần nhất. Cột last_active_at chỉ có từ bản này; người chưa vào lại kể từ đó (null) lấy refresh token mới nhất
 * (phiên đang dùng được xoay mỗi lần làm mới, token hết hạn bị xoá), không còn token thì lấy ngày tạo tài khoản.
 * shortcut: COALESCE nên chỉ số last_active_at không được dùng và bảng users bị quét; ổn với vài chục nghìn dòng, chạy 1 lần/ngày.
 */
const LAST_ACTIVE = Prisma.sql`COALESCE(u.last_active_at, GREATEST(u.created_at, COALESCE((SELECT MAX(rt.created_at) FROM refresh_tokens rt WHERE rt.user_id = u.id), u.created_at)))`;

const SPEND_CHARGES = Prisma.sql`'CRAWL_CHARGE', 'EXPLAIN_CHARGE', 'PE_CHARGE'`;
const SPEND_REFUNDS = Prisma.sql`'CRAWL_REFUND', 'EXPLAIN_REFUND', 'PE_REFUND'`;

/** Phần FROM ... WHERE của từng nhóm người nhận; dùng chung cho lấy danh sách và đếm. */
export const audience = {
  // Vắng trong khoảng (inactiveTo, inactiveFrom] và chưa nhận bước này
  winback: (step: number, inactiveFrom: Date, inactiveTo: Date, quiet: Date) =>
    Prisma.sql`FROM users u WHERE ${ELIGIBLE} AND ${quietSince(quiet)} AND ${notSent("winback", step)}
      AND ${LAST_ACTIVE} <= ${inactiveFrom} AND ${LAST_ACTIVE} > ${inactiveTo}`,

  // Chưa có Pro, không giữ vé Pro chưa kích hoạt, chưa được mời gần đây, và (trả lẻ nhiều lần gần đây hoặc sắp thi)
  proUpsell: (p: { now: Date; quiet: Date; repeatSince: Date; spendSince: Date; minPurchases: number; examFrom: Date; examTo: Date }) =>
    Prisma.sql`FROM users u WHERE ${ELIGIBLE} AND ${quietSince(p.quiet)}
      AND (u.pro_expires_at IS NULL OR u.pro_expires_at <= ${p.now})
      AND NOT EXISTS (SELECT 1 FROM pro_tickets t WHERE t.user_id = u.id AND t.activated_at IS NULL AND t.expires_at > ${p.now})
      AND NOT EXISTS (SELECT 1 FROM email_campaign_logs l WHERE l.user_id = u.id AND l.campaign = 'pro_upsell' AND l.sent_at >= ${p.repeatSince})
      AND (
        u.id IN (SELECT w.user_id FROM wallet_transactions w
                 WHERE w.type IN (${SPEND_CHARGES}, ${SPEND_REFUNDS}) AND w.created_at >= ${p.spendSince}
                 GROUP BY w.user_id HAVING SUM(w.type IN (${SPEND_CHARGES})) - SUM(w.type IN (${SPEND_REFUNDS})) >= ${p.minPurchases})
        OR (u.exam_date >= ${p.examFrom} AND u.exam_date <= ${p.examTo})
        OR EXISTS (SELECT 1 FROM user_exam_slots s WHERE s.user_id = u.id AND s.exam_date >= ${p.examFrom} AND s.exam_date <= ${p.examTo})
      )`,

  // Pro hết hạn trong (from, to] và chưa nhận bước này cho đúng ngày hết hạn đó (gia hạn xong là chu kỳ mới)
  proExpiry: (step: number, from: Date, to: Date) =>
    Prisma.sql`FROM users u WHERE ${ELIGIBLE} AND u.pro_expires_at > ${from} AND u.pro_expires_at <= ${to}
      AND ${notSent("pro_expiry", Prisma.sql`DATEDIFF(u.pro_expires_at, '1970-01-01') * ${STEP_CYCLE_FACTOR} + ${step}`)}`,
};

// Hằng số ghi thẳng vào câu SQL (không phải tham số) để MySQL thấy hai biểu thức MOD giống nhau (only_full_group_by)
const CYCLE = Prisma.raw(String(STEP_CYCLE_FACTOR));

const isUniqueViolation = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

export const marketingRepository = {
  pick: (from: Prisma.Sql, take: number) =>
    prisma.$queryRaw<Recipient[]>`SELECT u.id, u.email, u.full_name AS fullName, u.pro_expires_at AS proExpiresAt ${from} ORDER BY u.id LIMIT ${take}`,

  async count(from: Prisma.Sql) {
    const [row] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n ${from}`;
    return Number(row?.n ?? 0);
  },

  /** Giữ chỗ trước khi gửi: trùng (đã gửi bước này) thì trả null, không gửi lại. */
  async claim(userId: number, campaign: string, step: number) {
    // Hủy nhận thư giữa lúc dựng danh sách và lúc gửi (tối đa vài phút) vẫn phải được tôn trọng
    if (!(await prisma.user.findFirst({ where: { id: userId, marketingOptOut: false }, select: { id: true } }))) return null;
    try {
      return (await prisma.emailCampaignLog.create({ data: { userId, campaign, step }, select: { id: true } })).id;
    } catch (err) {
      if (isUniqueViolation(err)) return null;
      throw err;
    }
  },

  // Gửi lỗi: bỏ chỗ đã giữ để lần chạy sau thử lại
  release: (id: number) => prisma.emailCampaignLog.deleteMany({ where: { id } }),

  // Số thư đã gửi theo chiến dịch và bước (step % 10 = bước thật của chiến dịch lặp lại)
  sentCounts: () =>
    prisma.$queryRaw<{ campaign: string; step: number; n: bigint }[]>`
      SELECT campaign, MOD(step, ${CYCLE}) AS step, COUNT(*) AS n FROM email_campaign_logs GROUP BY campaign, MOD(step, ${CYCLE})`,

  // ---- Dữ liệu thật cho nội dung thư, lấy theo lô (không hỏi riêng từng người)

  // Môn của lần làm bài gần nhất: userId -> mã môn
  async lastSubjects(userIds: number[]) {
    const last = await prisma.examAttempt.groupBy({ by: ["userId"], where: { userId: { in: userIds } }, _max: { id: true } });
    const ids = last.map((r) => r._max.id).filter((id): id is number => id !== null);
    if (ids.length === 0) return new Map<number, string>();
    const rows = await prisma.examAttempt.findMany({ where: { id: { in: ids } }, select: { userId: true, exam: { select: { subjectCode: true } } } });
    return new Map(rows.filter((r) => r.exam.subjectCode).map((r) => [r.userId, r.exam.subjectCode!]));
  },

  // Số đề có đáp án (AI hoặc chỉnh tay) mới thêm theo môn từ `since`
  async newExamCounts(codes: string[], since: Date) {
    const rows = await prisma.exam.groupBy({ by: ["subjectCode"], where: { subjectCode: { in: codes }, createdAt: { gte: since }, answerSource: { in: ["AI", "MANUAL"] } }, _count: { _all: true } });
    return new Map(rows.map((r) => [r.subjectCode!, r._count._all]));
  },

  // Credit tặng sắp hết hạn: userId -> { tổng còn lại, hạn sớm nhất }
  async expiringCredit(userIds: number[], now: Date, until: Date) {
    const rows = await prisma.creditLot.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, remaining: { gt: 0 }, expiresAt: { gt: now, lte: until } },
      _sum: { remaining: true },
      _min: { expiresAt: true },
    });
    return new Map(rows.map((r) => [r.userId, { amount: r._sum.remaining ?? 0, expiresAt: r._min.expiresAt! }]));
  },

  // Ngày thi gần nhất trong [from, to] (lịch FAP hoặc ngày tự đặt): userId -> ngày
  async nextExamDates(userIds: number[], from: Date, to: Date) {
    const [slots, users] = await Promise.all([
      prisma.userExamSlot.findMany({ where: { userId: { in: userIds }, examDate: { gte: from, lte: to } }, select: { userId: true, examDate: true } }),
      prisma.user.findMany({ where: { id: { in: userIds }, examDate: { gte: from, lte: to } }, select: { id: true, examDate: true } }),
    ]);
    const result = new Map<number, Date>();
    for (const { userId, examDate } of [...slots, ...users.map((u) => ({ userId: u.id, examDate: u.examDate! }))]) {
      const cur = result.get(userId);
      if (!cur || examDate < cur) result.set(userId, examDate);
    }
    return result;
  },
};
