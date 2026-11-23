import { BADGE_NOTICE_LINK, BADGES, type BadgeDef } from "../constants/badges";
import { badgeRepository, type BadgeCounters, type UserBadgeRow } from "../repositories/badge.repository";
import { userRepository } from "../repositories/user.repository";
import { AppError } from "../rules/error";
import { pinError, progressOf, raisedTier, tierFor } from "../utils/badges";
import { userNoticeService } from "./user-notice.service";

/**
 * Tính số đo, ghi các huy hiệu mới đạt hoặc lên cấp (không bao giờ hạ cấp). `notify` = gửi thông báo cho mỗi lần lên cấp,
 * `dryRun` = chỉ đếm, không ghi. Chạy lại bao nhiêu lần cũng được: chỉ ghi khi cấp tính ra cao hơn cấp đã lưu.
 */
async function sync(userId: string, { notify = true, dryRun = false } = {}) {
  const [counters, rows] = await Promise.all([badgeRepository.counters(userId), badgeRepository.listByUser(userId)]);
  const stored = new Map(rows.map((r) => [r.badgeKey, r]));
  const raised: { def: BadgeDef; tier: number; isNew: boolean }[] = [];
  for (const def of BADGES) {
    const row = stored.get(def.key);
    const tier = raisedTier(row?.tier ?? 0, tierFor(def, counters[def.metric]));
    if (tier && (dryRun || (await badgeRepository.raise(userId, def.key, tier, !!row)))) raised.push({ def, tier, isNew: !row });
  }
  if (notify && !dryRun) {
    for (const { def, tier, isNew } of raised) {
      const label = def.tiers.length > 1 ? ` (${def.tiers.find((t) => t.level === tier)!.label})` : "";
      await userNoticeService.notify(userId, {
        kind: "badge.earned",
        level: "success",
        title: isNew ? `Bạn nhận được huy hiệu "${def.name}"${label}` : `Huy hiệu "${def.name}" đã lên cấp${label}`,
        body: def.description,
        link: BADGE_NOTICE_LINK,
      });
    }
  }
  return { counters, rows: raised.length && !dryRun ? await badgeRepository.listByUser(userId) : rows, raised: raised.length };
}

function view(counters: BadgeCounters, rows: UserBadgeRow[]) {
  const stored = new Map(rows.map((r) => [r.badgeKey, r]));
  const items = BADGES.map((def) => {
    const row = stored.get(def.key);
    const tier = row?.tier ?? 0;
    return {
      key: def.key,
      category: def.category,
      name: def.name,
      description: def.description,
      icon: def.icon,
      tiers: def.tiers,
      tier,
      progress: progressOf(def, tier, counters[def.metric]),
      earnedAt: row ? row.earnedAt.toISOString() : null,
      pinned: !!row?.pinned,
    };
  });
  return { items, pinned: items.filter((i) => i.pinned).map((i) => i.key) };
}

// Mỗi lượt trả lời ôn tập gọi chấm huy hiệu: gộp lại, mỗi người tối đa một lần trong ngần này thời gian (GET /badges/me vẫn chấm lại khi đọc)
const THROTTLE_MS = 30_000;
const lastRun = new Map<string, number>();

export const badgeService = {
  /** Gọi SAU khi việc chính đã commit, không cần await: không bao giờ ném lỗi. */
  async evaluate(userId: string) {
    try {
      await sync(userId);
    } catch (err) {
      console.error("[badge] evaluate failed:", (err as Error).message);
    }
  },

  /** Như evaluate nhưng bỏ qua nếu vừa chấm cho người này trong THROTTLE_MS: dành cho chỗ gọi dày như từng thẻ ôn. */
  async evaluateThrottled(userId: string) {
    const now = Date.now();
    if (now - (lastRun.get(userId) ?? 0) < THROTTLE_MS) return;
    lastRun.set(userId, now);
    if (lastRun.size > 5000) for (const [k, t] of lastRun) if (now - t >= THROTTLE_MS) lastRun.delete(k); // shortcut: bộ nhớ trong tiến trình, một máy chủ
    await badgeService.evaluate(userId);
  },

  /** Như evaluate, thêm người đã giới thiệu tài khoản này (huy hiệu Đại sứ đếm người được giới thiệu đã xác minh email). */
  async evaluateWithReferrer(userId: string) {
    await badgeService.evaluate(userId);
    const referrerId = await userRepository
      .findReferralProfile(userId)
      .then((u) => u?.referredById)
      .catch(() => null);
    if (referrerId) await badgeService.evaluate(referrerId);
  },

  /** Toàn bộ danh mục kèm cấp, tiến độ và ghim của người dùng. Đọc cũng đồng bộ lại cấp nên tiến độ luôn khớp. */
  async mine(userId: string) {
    const { counters, rows } = await sync(userId);
    return view(counters, rows);
  },

  async setPins(userId: string, keys: string[]) {
    const rows = await badgeRepository.listByUser(userId);
    const error = pinError(keys, new Set(rows.filter((r) => r.tier > 0).map((r) => r.badgeKey)));
    if (error) throw new AppError(error);
    await badgeRepository.setPins(userId, keys);
    return badgeService.mine(userId);
  },

  /** Backfill: ghi cấp cho một người, không gửi thông báo. Trả số huy hiệu vừa ghi/lên cấp (dryRun: sẽ ghi). */
  backfill: async (userId: string, dryRun: boolean) => (await sync(userId, { notify: false, dryRun })).raised,

  /** Admin: số người giữ từng huy hiệu, chia theo cấp. */
  async adminStats() {
    const groups = await badgeRepository.countByTier();
    return BADGES.map((def) => {
      const byTier = [1, 2, 3].map((level) => groups.find((g) => g.badgeKey === def.key && g.tier === level)?._count._all ?? 0);
      return { key: def.key, name: def.name, holders: byTier.reduce((a, b) => a + b, 0), byTier };
    });
  },
};
