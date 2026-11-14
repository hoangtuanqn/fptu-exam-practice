import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { CAMPAIGN_META, CLICK_SCANNER_MS, CONVERSION_DAYS, STEP_CYCLE_FACTOR, TOPIC_BITS, type CampaignKey } from "../constants/marketing";
import { DAY_MS } from "../utils/time";

export interface Recipient {
  id: number;
  email: string;
  fullName: string;
  proExpiresAt: Date | null;
}

// Tạm dừng 30 ngày chặn mọi chiến dịch trừ nhắc hết hạn Pro (tắt riêng loại "renewal" hoặc huỷ tất cả mới chặn thư đó)
const pauseApplies = (campaign: CampaignKey) => campaign !== "pro_expiry";

/**
 * Ai được nhận thư của chiến dịch: thành viên thường, đang hoạt động, đã xác minh email, không từ chối nhận thư,
 * không tắt loại thư của chiến dịch, và không đang tạm dừng tại `pausedAt` (null = bỏ qua tạm dừng, chỉ dùng cho nhắc hết hạn Pro).
 */
const eligible = (campaign: CampaignKey, pausedAt: Date | null) =>
  Prisma.sql`u.role = 'USER' AND u.status = 'ACTIVE' AND u.email_verified_at IS NOT NULL AND u.marketing_opt_out = false
    AND (u.marketing_muted_topics & ${TOPIC_BITS[CAMPAIGN_META[campaign].topic]}) = 0
    ${pausedAt ? Prisma.sql`AND (u.marketing_muted_until IS NULL OR u.marketing_muted_until <= ${pausedAt})` : Prisma.empty}`;

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
  winback: (step: number, inactiveFrom: Date, inactiveTo: Date, quiet: Date, now: Date) =>
    Prisma.sql`FROM users u WHERE ${eligible("winback", now)} AND ${quietSince(quiet)} AND ${notSent("winback", step)}
      AND ${LAST_ACTIVE} <= ${inactiveFrom} AND ${LAST_ACTIVE} > ${inactiveTo}`,

  // Chưa có Pro, không giữ vé Pro chưa kích hoạt, chưa được mời gần đây, và (trả lẻ nhiều lần gần đây hoặc sắp thi)
  proUpsell: (p: { now: Date; quiet: Date; repeatSince: Date; spendSince: Date; minPurchases: number; examFrom: Date; examTo: Date }) =>
    Prisma.sql`FROM users u WHERE ${eligible("pro_upsell", p.now)} AND ${quietSince(p.quiet)}
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
    Prisma.sql`FROM users u WHERE ${eligible("pro_expiry", null)} AND u.pro_expires_at > ${from} AND u.pro_expires_at <= ${to}
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

  /** Giữ chỗ trước khi gửi: trùng (đã gửi bước này) thì trả null, không gửi lại. `target` = đường dẫn nội bộ của nút trong thư. */
  async claim(userId: number, campaign: CampaignKey, step: number, target: string) {
    // Hủy, tắt loại thư hoặc tạm dừng giữa lúc dựng danh sách và lúc gửi (tối đa vài phút) vẫn phải được tôn trọng
    const now = new Date();
    const pause = pauseApplies(campaign) ? { OR: [{ marketingMutedUntil: null }, { marketingMutedUntil: { lte: now } }] } : {};
    const user = await prisma.user.findFirst({ where: { id: userId, marketingOptOut: false, ...pause }, select: { marketingMutedTopics: true } });
    if (!user || (user.marketingMutedTopics & TOPIC_BITS[CAMPAIGN_META[campaign].topic]) !== 0) return null;
    try {
      return (await prisma.emailCampaignLog.create({ data: { userId, campaign, step, target }, select: { id: true } })).id;
    } catch (err) {
      if (isUniqueViolation(err)) return null;
      throw err;
    }
  },

  // Gửi lỗi: bỏ chỗ đã giữ để lần chạy sau thử lại
  release: (id: number) => prisma.emailCampaignLog.deleteMany({ where: { id } }),

  /**
   * Ghi lượt bấm đầu tiên rồi trả đích đã lưu (null nếu log không còn). Bấm trong CLICK_SCANNER_MS sau khi gửi không ghi:
   * shortcut: trình quét thư (Outlook, Gmail) mở link ngay khi nhận; quét chậm hơn 30 s vẫn bị tính là bấm, chưa có cách lọc tốt hơn.
   */
  async recordClick(logId: number, now: Date) {
    await prisma.emailCampaignLog.updateMany({ where: { id: logId, clickedAt: null, sentAt: { lte: new Date(now.getTime() - CLICK_SCANNER_MS) } }, data: { clickedAt: now } });
    return (await prisma.emailCampaignLog.findUnique({ where: { id: logId }, select: { target: true } }))?.target ?? null;
  },

  // Người dùng vừa hoạt động: đánh dấu "quay lại" cho các thư của họ trong CONVERSION_DAYS ngày qua chưa được đánh dấu (chỉ số user_id, sent_at)
  markReturned: (userId: number, now: Date) =>
    prisma.emailCampaignLog
      .updateMany({ where: { userId, returnedAt: null, sentAt: { gte: new Date(now.getTime() - CONVERSION_DAYS * DAY_MS), lte: now } }, data: { returnedAt: now } })
      .then(() => undefined),

  // Số thư đã gửi theo chiến dịch và bước (step % 10 = bước thật của chiến dịch lặp lại)
  sentCounts: () =>
    prisma.$queryRaw<{ campaign: string; step: number; n: bigint }[]>`
      SELECT campaign, MOD(step, ${CYCLE}) AS step, COUNT(*) AS n FROM email_campaign_logs GROUP BY campaign, MOD(step, ${CYCLE})`,

  // ---- Thống kê cho trang admin

  // Số thư gửi từ `since` của các chiến dịch này (chỉ số campaign, sent_at)
  async sentSince(campaigns: readonly string[], since: Date) {
    const [row] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM email_campaign_logs WHERE campaign IN (${Prisma.join(campaigns)}) AND sent_at >= ${since}`;
    return Number(row?.n ?? 0);
  },

  /**
   * Phễu theo chiến dịch cho thư gửi trong [since, now). Thư gửi sau `matured` (chưa đủ CONVERSION_DAYS ngày) chỉ đếm vào `pending`.
   * Mua Pro: có plan_purchases trả tiền (price > 0, tức mua bằng credit hoặc kích hoạt vé; Pro tặng không có dòng trả tiền) trong
   * CONVERSION_DAYS ngày sau thư, và thư là thư gần nhất người đó nhận trước lúc mua (last-touch, mọi chiến dịch), nên một lần mua chỉ tính cho một thư.
   */
  funnel: (campaigns: readonly string[], since: Date, matured: Date) =>
    prisma.$queryRaw<{ campaign: string; sent: unknown; pending: unknown; clicked: unknown; returned: unknown; bought: unknown }[]>`
      SELECT l.campaign,
        SUM(l.sent_at < ${matured}) AS sent,
        SUM(l.sent_at >= ${matured}) AS pending,
        SUM(l.sent_at < ${matured} AND l.clicked_at IS NOT NULL) AS clicked,
        SUM(l.sent_at < ${matured} AND l.returned_at IS NOT NULL) AS returned,
        SUM(l.sent_at < ${matured} AND EXISTS (
          SELECT 1 FROM plan_purchases p
          WHERE p.user_id = l.user_id AND p.price > 0 AND p.created_at >= l.sent_at AND p.created_at < DATE_ADD(l.sent_at, INTERVAL ${CONVERSION_DAYS} DAY)
            AND NOT EXISTS (
              SELECT 1 FROM email_campaign_logs l2
              WHERE l2.user_id = l.user_id AND l2.sent_at <= p.created_at AND (l2.sent_at > l.sent_at OR (l2.sent_at = l.sent_at AND l2.id > l.id))
            )
        )) AS bought
      FROM email_campaign_logs l
      WHERE l.campaign IN (${Prisma.join(campaigns)}) AND l.sent_at >= ${since}
      GROUP BY l.campaign`,

  // Tỷ lệ huỷ nhận thư: người đã huỷ / thành viên đã xác minh email
  async optOutCounts() {
    const [row] = await prisma.$queryRaw<{ total: bigint; optedOut: unknown }[]>`
      SELECT COUNT(*) AS total, COALESCE(SUM(u.marketing_opt_out), 0) AS optedOut FROM users u WHERE u.role = 'USER' AND u.email_verified_at IS NOT NULL`;
    return { total: Number(row?.total ?? 0), optedOut: Number(row?.optedOut ?? 0) };
  },

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
