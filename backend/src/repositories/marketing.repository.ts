import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import {
  BROADCAST_PREFIX,
  BROADCAST_STEP,
  CAMPAIGN_KEYS,
  CLICK_SCANNER_MS,
  CONVERSION_DAYS,
  STEP_CYCLE_FACTOR,
  TOPIC_BITS,
  broadcastCampaign,
  isBroadcast,
  topicOf,
  type BroadcastSegment,
  type LogCampaign,
} from "../constants/marketing";
import { DAY_MS } from "../utils/time";

export interface Recipient {
  id: number;
  email: string;
  fullName: string;
  proExpiresAt: Date | null;
}

// Tạm dừng 30 ngày chặn mọi chiến dịch trừ nhắc hết hạn Pro (tắt riêng loại "renewal" hoặc huỷ tất cả mới chặn thư đó)
const pauseApplies = (campaign: LogCampaign) => campaign !== "pro_expiry";

/**
 * Ai được nhận thư của chiến dịch: thành viên thường, đang hoạt động, đã xác minh email, không từ chối nhận thư,
 * không tắt loại thư của chiến dịch, và không đang tạm dừng tại `pausedAt` (null = bỏ qua tạm dừng, chỉ dùng cho nhắc hết hạn Pro).
 */
const eligible = (campaign: LogCampaign, pausedAt: Date | null) =>
  Prisma.sql`u.role = 'USER' AND u.status = 'ACTIVE' AND u.email_verified_at IS NOT NULL AND u.marketing_opt_out = false
    AND (u.marketing_muted_topics & ${TOPIC_BITS[topicOf(campaign)]}) = 0
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

// Mọi thư marketing (3 chiến dịch tự động + gửi thủ công), viết để dùng được chỉ số (campaign, sent_at)
const MARKETING_LOG = Prisma.sql`(l.campaign IN (${Prisma.join(CAMPAIGN_KEYS)}) OR l.campaign LIKE ${`${BROADCAST_PREFIX}%`})`;

/**
 * Thư `l` dẫn tới mua Pro: có plan_purchases trả tiền (price > 0, tức mua bằng credit hoặc kích hoạt vé; Pro tặng không có dòng trả tiền) trong
 * CONVERSION_DAYS ngày sau thư, và thư là thư gần nhất người đó nhận trước lúc mua (last-touch, mọi chiến dịch), nên một lần mua chỉ tính cho một thư.
 */
const BOUGHT = Prisma.sql`EXISTS (
  SELECT 1 FROM plan_purchases p
  WHERE p.user_id = l.user_id AND p.price > 0 AND p.created_at >= l.sent_at AND p.created_at < DATE_ADD(l.sent_at, INTERVAL ${CONVERSION_DAYS} DAY)
    AND NOT EXISTS (
      SELECT 1 FROM email_campaign_logs l2
      WHERE l2.user_id = l.user_id AND l2.sent_at <= p.created_at AND (l2.sent_at > l.sent_at OR (l2.sent_at = l.sent_at AND l2.id > l.id))
    )
)`;

export interface BroadcastAudience {
  id: number;
  segment: BroadcastSegment;
  segmentDays: number | null;
}

// Nhóm người nhận của thư gửi thủ công: danh sách cố định, không nhận SQL tự do
const segmentSql = (b: BroadcastAudience, now: Date, examFrom: Date, examTo: Date) => {
  switch (b.segment) {
    case "pro":
      return Prisma.sql`u.pro_expires_at > ${now}`;
    case "free":
      return Prisma.sql`(u.pro_expires_at IS NULL OR u.pro_expires_at <= ${now})`;
    case "inactive":
      return Prisma.sql`${LAST_ACTIVE} <= ${new Date(now.getTime() - (b.segmentDays ?? 0) * DAY_MS)}`;
    case "exam_soon":
      return Prisma.sql`((u.exam_date >= ${examFrom} AND u.exam_date <= ${examTo})
        OR EXISTS (SELECT 1 FROM user_exam_slots s WHERE s.user_id = u.id AND s.exam_date >= ${examFrom} AND s.exam_date <= ${examTo}))`;
    case "all":
      return Prisma.sql`TRUE`;
  }
};

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

  // Gửi thủ công: nhóm đã chọn, chưa nhận thư này. `quiet` null = bỏ qua khoảng cách giữa hai thư (chỉ để đếm "còn ai chưa nhận" và ước tính)
  broadcast: (b: BroadcastAudience, p: { now: Date; quiet: Date | null; examFrom: Date; examTo: Date }) =>
    Prisma.sql`FROM users u WHERE ${eligible(broadcastCampaign(b.id), p.now)} ${p.quiet ? Prisma.sql`AND ${quietSince(p.quiet)}` : Prisma.empty}
      AND ${notSent(broadcastCampaign(b.id), BROADCAST_STEP)} AND ${segmentSql(b, p.now, p.examFrom, p.examTo)}`,
};

export interface LogFilter {
  campaign?: string; // khoá chiến dịch, "broadcast" (mọi thư gửi thủ công) hoặc broadcast:<id>
  from?: Date;
  to?: Date; // không gồm mốc này
  email?: string; // email chứa chuỗi này
  skip: number;
  take: number;
}

// Ký tự đại diện của LIKE trong chuỗi admin nhập được hiểu đúng nghĩa đen
const likeContains = (s: string) => `%${s.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

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
  async claim(userId: number, campaign: LogCampaign, step: number, target: string) {
    // Hủy, tắt loại thư hoặc tạm dừng giữa lúc dựng danh sách và lúc gửi (tối đa vài phút) vẫn phải được tôn trọng
    const now = new Date();
    const pause = pauseApplies(campaign) ? { OR: [{ marketingMutedUntil: null }, { marketingMutedUntil: { lte: now } }] } : {};
    const user = await prisma.user.findFirst({ where: { id: userId, marketingOptOut: false, ...pause }, select: { marketingMutedTopics: true } });
    if (!user || (user.marketingMutedTopics & TOPIC_BITS[topicOf(campaign)]) !== 0) return null;
    // Gửi thủ công bị dừng giữa lượt chạy: các thư còn lại trong lô không gửi
    const broadcastId = isBroadcast(campaign) ? Number(campaign.slice(BROADCAST_PREFIX.length)) : null;
    if (broadcastId !== null && !(await prisma.marketingBroadcast.findFirst({ where: { id: broadcastId, status: "SENDING" }, select: { id: true } }))) return null;
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

  // Số thư marketing gửi từ `since`, gồm cả gửi thủ công (chỉ số campaign, sent_at)
  async sentSince(since: Date) {
    const [row] = await prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM email_campaign_logs l WHERE ${MARKETING_LOG} AND l.sent_at >= ${since}`;
    return Number(row?.n ?? 0);
  },

  /**
   * Phễu theo chiến dịch (mỗi thư gửi thủ công một dòng broadcast:<id>) cho thư gửi trong [since, now).
   * Thư gửi sau `matured` (chưa đủ CONVERSION_DAYS ngày) chỉ đếm vào `pending`. Mua Pro theo BOUGHT (last-touch).
   */
  funnel: (since: Date, matured: Date) =>
    prisma.$queryRaw<{ campaign: string; sent: unknown; pending: unknown; clicked: unknown; returned: unknown; bought: unknown }[]>`
      SELECT l.campaign,
        SUM(l.sent_at < ${matured}) AS sent,
        SUM(l.sent_at >= ${matured}) AS pending,
        SUM(l.sent_at < ${matured} AND l.clicked_at IS NOT NULL) AS clicked,
        SUM(l.sent_at < ${matured} AND l.returned_at IS NOT NULL) AS returned,
        SUM(l.sent_at < ${matured} AND ${BOUGHT}) AS bought
      FROM email_campaign_logs l
      WHERE ${MARKETING_LOG} AND l.sent_at >= ${since}
      GROUP BY l.campaign`,

  // Số thư đã gửi và đã bấm của từng thư gửi thủ công (chỉ số campaign, sent_at)
  async broadcastCounts(ids: number[]) {
    if (ids.length === 0) return new Map<number, { sent: number; clicked: number }>();
    const rows = await prisma.$queryRaw<{ campaign: string; sent: bigint; clicked: unknown }[]>`
      SELECT campaign, COUNT(*) AS sent, SUM(clicked_at IS NOT NULL) AS clicked FROM email_campaign_logs
      WHERE campaign IN (${Prisma.join(ids.map(broadcastCampaign))}) GROUP BY campaign`;
    return new Map(rows.map((r) => [Number(r.campaign.slice(BROADCAST_PREFIX.length)), { sent: Number(r.sent), clicked: Number(r.clicked ?? 0) }]));
  },

  /**
   * Nhật ký thư, mới nhất trước. Lọc đúng một chiến dịch thì sắp theo (sent_at, id) trên chỉ số (campaign, sent_at);
   * còn lại sắp theo id (khoá chính, cùng chiều thời gian gửi).
   * shortcut: tìm email dạng "chứa" nên không dùng được chỉ số users.email; ổn với vài chục nghìn người dùng, đổi sang tìm theo tiền tố nếu chậm.
   */
  async logs(f: LogFilter) {
    const cond = Prisma.join(
      [
        f.campaign === "broadcast" ? Prisma.sql`l.campaign LIKE ${`${BROADCAST_PREFIX}%`}` : f.campaign ? Prisma.sql`l.campaign = ${f.campaign}` : MARKETING_LOG,
        ...(f.from ? [Prisma.sql`l.sent_at >= ${f.from}`] : []),
        ...(f.to ? [Prisma.sql`l.sent_at < ${f.to}`] : []),
        ...(f.email ? [Prisma.sql`u.email LIKE ${likeContains(f.email)}`] : []),
      ],
      " AND ",
    );
    const order = f.campaign && f.campaign !== "broadcast" ? Prisma.sql`l.sent_at DESC, l.id DESC` : Prisma.sql`l.id DESC`;
    const [items, [count]] = await Promise.all([
      prisma.$queryRaw<{ id: number; sentAt: Date; email: string; campaign: string; step: unknown; clicked: unknown; bought: unknown; returned: unknown }[]>`
        SELECT l.id, l.sent_at AS sentAt, u.email, l.campaign, MOD(l.step, ${CYCLE}) AS step, l.clicked_at IS NOT NULL AS clicked, ${BOUGHT} AS bought, l.returned_at IS NOT NULL AS returned
        FROM email_campaign_logs l JOIN users u ON u.id = l.user_id
        WHERE ${cond} ORDER BY ${order} LIMIT ${f.take} OFFSET ${f.skip}`,
      prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) AS n FROM email_campaign_logs l JOIN users u ON u.id = l.user_id WHERE ${cond}`,
    ]);
    const yes = (v: unknown) => Number(v) === 1;
    return {
      items: items.map((r) => ({ id: r.id, sentAt: r.sentAt, email: r.email, campaign: r.campaign, step: Number(r.step), clicked: yes(r.clicked), bought: yes(r.bought), returned: yes(r.returned) })),
      total: Number(count?.n ?? 0),
    };
  },

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
