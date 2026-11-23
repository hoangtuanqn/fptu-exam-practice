import { Prisma } from "@prisma/client";
import { prisma } from "../configs/prisma";
import { BADGE_HIGH_SCORE, BADGE_PERFECT_SCORE, BADGE_SCORE_MIN_QUESTIONS, type BadgeMetric } from "../constants/badges";

export type BadgeCounters = Record<BadgeMetric, number>;

const DAY_SEC = 86_400;

const badgeSelect = { badgeKey: true, tier: true, pinned: true, earnedAt: true } satisfies Prisma.UserBadgeSelect;
export type UserBadgeRow = Prisma.UserBadgeGetPayload<{ select: typeof badgeSelect }>;

export const badgeRepository = {
  /**
   * Mọi số đo của một người trong một truy vấn. Mỗi phần chỉ đọc dòng của người đó qua index bắt đầu bằng user_id
   * (exam_attempts(user_id,created_at), daily_check_ins(user_id,day), study_days(user_id,day), user_review_logs(user_id,reviewed_at),
   * exam_contributions(user_id,created_at), answer_reports(user_id,...), users(referred_by_id), plan_purchases(user_id,created_at)).
   */
  async counters(userId: string): Promise<BadgeCounters> {
    const [r] = await prisma.$queryRaw<Record<string, unknown>[]>`
      SELECT
        ea.attempts, ea.high_scores, ea.perfect_scores, pp.purchases, pp.pro_seconds,
        (SELECT email_verified_at IS NOT NULL FROM users WHERE id = ${userId}) AS verified,
        (SELECT COALESCE(MAX(streak), 0) FROM daily_check_ins WHERE user_id = ${userId}) AS longest_streak,
        (SELECT COUNT(*) FROM (
          SELECT day FROM study_days WHERE user_id = ${userId} AND reviews > 0
          UNION SELECT DATE(reviewed_at + INTERVAL 7 HOUR) FROM user_review_logs WHERE user_id = ${userId}
        ) d) AS review_days,
        (SELECT COUNT(*) FROM exam_contributions WHERE user_id = ${userId} AND status = 'APPROVED') AS contributions,
        (SELECT COUNT(*) FROM answer_reports WHERE user_id = ${userId} AND status = 'APPROVED') AS confirmed_reports,
        (SELECT COUNT(*) FROM users WHERE referred_by_id = ${userId} AND email_verified_at IS NOT NULL) AS referrals
      FROM
        (SELECT COALESCE(SUM(total_graded >= ${BADGE_SCORE_MIN_QUESTIONS}), 0) AS attempts,
                COALESCE(SUM(total_graded >= ${BADGE_SCORE_MIN_QUESTIONS} AND score >= ${BADGE_HIGH_SCORE}), 0) AS high_scores,
                COALESCE(SUM(total_graded >= ${BADGE_SCORE_MIN_QUESTIONS} AND score >= ${BADGE_PERFECT_SCORE}), 0) AS perfect_scores
           FROM exam_attempts WHERE user_id = ${userId}) ea
        CROSS JOIN
        (SELECT COUNT(*) AS purchases, COALESCE(SUM(TIMESTAMPDIFF(SECOND, starts_at, ends_at)), 0) AS pro_seconds
           FROM plan_purchases WHERE user_id = ${userId}) pp`;
    const n = (v: unknown) => Number(v ?? 0); // COUNT = bigint, SUM = Decimal
    return {
      verified: n(r?.verified),
      attempts: n(r?.attempts),
      highScores: n(r?.high_scores),
      perfectScores: n(r?.perfect_scores),
      longestStreak: n(r?.longest_streak),
      reviewDays: n(r?.review_days),
      contributions: n(r?.contributions),
      confirmedReports: n(r?.confirmed_reports),
      referrals: n(r?.referrals),
      proPurchases: n(r?.purchases),
      proDays: Math.floor(n(r?.pro_seconds) / DAY_SEC),
    };
  },

  // Unique (user_id, badge_key)
  listByUser: (userId: string) => prisma.userBadge.findMany({ where: { userId }, select: badgeSelect }),

  /** Ghi cấp mới nếu cao hơn cấp đang có. true = lần gọi này thực sự lên cấp (hai lần chạy cùng lúc chỉ một lần true). */
  async raise(userId: string, badgeKey: string, tier: number, exists: boolean) {
    if (!exists) {
      try {
        await prisma.userBadge.create({ data: { userId, badgeKey, tier } });
        return true;
      } catch (err) {
        if (!(err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002")) throw err;
      }
    }
    const { count } = await prisma.userBadge.updateMany({ where: { userId, badgeKey, tier: { lt: tier } }, data: { tier, tierUpdatedAt: new Date() } });
    return count === 1;
  },

  /** Thay bộ ghim: chỉ huy hiệu đã có dòng mới được ghim. */
  setPins: (userId: string, keys: string[]) =>
    prisma.$transaction([
      prisma.userBadge.updateMany({ where: { userId, pinned: true, badgeKey: { notIn: keys } }, data: { pinned: false } }),
      prisma.userBadge.updateMany({ where: { userId, badgeKey: { in: keys } }, data: { pinned: true } }),
    ]),

  // Admin: một truy vấn gom theo huy hiệu và cấp
  countByTier: () => prisma.userBadge.groupBy({ by: ["badgeKey", "tier"], _count: { _all: true } }),
};
