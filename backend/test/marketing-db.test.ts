import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Chọn người nhận thư marketing trên MySQL thật (TEST_DB=1 npm test). Không gửi thư: chỉ kiểm tra truy vấn chọn người và log chống gửi trùng.

const loadModules = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  campaigns: (await import("../src/services/marketing-campaign.service")).marketingCampaignService,
  marketing: (await import("../src/services/marketing.service")).marketingService,
  repo: (await import("../src/repositories/marketing.repository")).marketingRepository,
  token: (await import("../src/utils/marketing-token")).signMarketingToken,
  env: (await import("../src/configs/env")).env,
});

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

describe("marketing audiences (MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof loadModules>>;
  const ids: Record<string, number> = {};

  before(async () => {
    db = await createThrowawayDb();
    m = await loadModules();
    const mk = async (key: string, data: Record<string, unknown>) => {
      const u = await m.prisma.user.create({ data: { email: `${key}@test.local`, fullName: key, password: "x", emailVerifiedAt: daysAgo(200), createdAt: daysAgo(200), ...data } });
      ids[key] = u.id;
    };
    await mk("inactive20", { lastActiveAt: daysAgo(20) }); // win-back bước 1
    await mk("optedOut", { lastActiveAt: daysAgo(20), marketingOptOut: true }); // không nhận gì
    await mk("unverified", { lastActiveAt: daysAgo(20), emailVerifiedAt: null }); // không nhận gì
    await mk("legacy40", {}); // chưa có last_active_at: lấy refresh token mới nhất (40 ngày) -> win-back bước 2
    await m.prisma.refreshToken.create({ data: { userId: ids.legacy40!, tokenHash: "a".repeat(64), familyId: "f", expiresAt: new Date(Date.now() + DAY), createdAt: daysAgo(40) } });
    await mk("proSoon", { lastActiveAt: new Date(), proExpiresAt: new Date(Date.now() + 3 * DAY) }); // nhắc hết hạn bước 1
    await mk("examSoon", { lastActiveAt: new Date(), examDate: new Date(Date.now() + 10 * DAY) }); // mời Pro
  });

  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
  });

  it("counts only eligible users per campaign", async () => {
    assert.deepEqual(await m.campaigns.eligibleCounts(), { winback: 2, pro_upsell: 1, pro_expiry: 1 });
  });

  it("never claims the same step twice and respects the 7-day gap", async () => {
    const first = await m.repo.claim(ids.inactive20!, "winback", 1);
    assert.ok(first);
    assert.equal(await m.repo.claim(ids.inactive20!, "winback", 1), null);
    assert.equal((await m.campaigns.eligibleCounts()).winback, 1);
    const counts = await m.marketing.campaigns();
    assert.equal(counts.find((c) => c.key === "winback")!.steps[0]!.sentCount, 1);
    await m.repo.release(first);
    assert.equal((await m.campaigns.eligibleCounts()).winback, 2);
  });

  it("opts out with a valid token and rejects a bad one", async () => {
    assert.deepEqual(await m.marketing.unsubscribe(m.token(m.env.JWT_SECRET, ids.examSoon!)), { ok: true });
    assert.equal((await m.campaigns.eligibleCounts()).pro_upsell, 0);
    await assert.rejects(m.marketing.unsubscribe(`${ids.examSoon}.${"0".repeat(32)}`));
  });
});
