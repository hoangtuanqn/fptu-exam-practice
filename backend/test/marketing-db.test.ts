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
  click: await import("../src/utils/marketing-click"),
  settings: (await import("../src/services/marketing-setting.service")).marketingSettingService,
  stats: (await import("../src/services/marketing-stats.service")).marketingStatsService,
  mail: (await import("../src/services/mail.service")).mailService,
  env: (await import("../src/configs/env")).env,
});

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
type SentMail = { to: string; html: string; text: string };

describe("marketing audiences (MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof loadModules>>;
  const ids: Record<string, number> = {};
  const outbox: SentMail[] = [];
  let mk: (key: string, data: Record<string, unknown>) => Promise<void>;

  before(async () => {
    db = await createThrowawayDb();
    m = await loadModules();
    // Không bao giờ gửi thư thật trong test: thay hàm gửi bằng hộp thư giả
    m.mail.sendMarketing = async (to, mail) => {
      outbox.push({ to, html: mail.html, text: mail.text });
    };
    mk = async (key: string, data: Record<string, unknown>) => {
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
    const first = await m.repo.claim(ids.inactive20!, "winback", 1, "/account/review");
    assert.ok(first);
    assert.equal(await m.repo.claim(ids.inactive20!, "winback", 1, "/account/review"), null);
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

  // ---- Đo lường: bấm nút, quay lại, phễu, tạm dừng

  it("records a click only after the scanner window, once, and redirects only to the stored target", async () => {
    const id = (await m.repo.claim(ids.proSoon!, "winback", 7, "/pro"))!;
    const sentAt = (await m.prisma.emailCampaignLog.findUniqueOrThrow({ where: { id } })).sentAt.getTime();
    assert.equal(await m.repo.recordClick(id, new Date(sentAt + 5_000)), "/pro");
    assert.equal((await m.prisma.emailCampaignLog.findUniqueOrThrow({ where: { id } })).clickedAt, null); // trình quét thư
    const at = new Date(sentAt + 31_000);
    await m.repo.recordClick(id, at);
    await m.repo.recordClick(id, new Date(sentAt + 90_000));
    assert.equal((await m.prisma.emailCampaignLog.findUniqueOrThrow({ where: { id } })).clickedAt?.getTime(), at.getTime());

    const site = m.env.CLIENT_URL;
    const good = m.click.signClickToken(m.env.JWT_SECRET, id);
    assert.equal(await m.marketing.click(good), `${site}/pro`);
    assert.equal(await m.marketing.click(good.slice(0, -1) + (good.endsWith("0") ? "1" : "0")), site);
    assert.equal(await m.marketing.click(m.token(m.env.JWT_SECRET, id)), site); // token huỷ nhận thư không mở được nút
    assert.equal(await m.marketing.click(m.click.signClickToken(m.env.JWT_SECRET, 999_999)), site); // log không còn
    await m.prisma.emailCampaignLog.update({ where: { id }, data: { target: "@evil.example" } });
    assert.equal(await m.marketing.click(good), site);
  });

  it("puts the signed click url into the mail after claiming and stores the target", async () => {
    const mail = { subject: "s", html: `<a href="${m.click.CLICK_PLACEHOLDER}">x</a>`, text: `Vào: ${m.click.CLICK_PLACEHOLDER}` };
    const to = { id: ids.proSoon!, email: "proSoon@test.local", fullName: "proSoon", proExpiresAt: null };
    assert.equal(await m.campaigns.deliver({ campaign: "winback", step: 8, target: "/account/review", to, mail }), true);
    const log = await m.prisma.emailCampaignLog.findFirstOrThrow({ where: { userId: to.id, campaign: "winback", step: 8 } });
    assert.equal(log.target, "/account/review");
    const sent = outbox.at(-1)!;
    const link = `/api/v1/marketing/click?t=${m.click.signClickToken(m.env.JWT_SECRET, log.id)}`;
    assert.ok(sent.html.includes(link) && sent.text.includes(link));
    assert.equal(sent.html.includes(m.click.CLICK_PLACEHOLDER) || sent.text.includes(m.click.CLICK_PLACEHOLDER), false);
  });

  it("marks recent mails as returned once, leaving old or already marked ones", async () => {
    await mk("returner", { lastActiveAt: daysAgo(3) });
    const u = ids.returner!;
    const earlier = daysAgo(0.5);
    const recent = await m.prisma.emailCampaignLog.create({ data: { userId: u, campaign: "winback", step: 1, sentAt: daysAgo(2) } });
    const old = await m.prisma.emailCampaignLog.create({ data: { userId: u, campaign: "winback", step: 2, sentAt: daysAgo(10) } });
    const marked = await m.prisma.emailCampaignLog.create({ data: { userId: u, campaign: "winback", step: 3, sentAt: daysAgo(1), returnedAt: earlier } });
    const now = new Date();
    await m.repo.markReturned(u, now);
    const get = async (id: number) => (await m.prisma.emailCampaignLog.findUniqueOrThrow({ where: { id } })).returnedAt?.getTime() ?? null;
    assert.equal(await get(recent.id), now.getTime());
    assert.equal(await get(old.id), null);
    assert.equal(await get(marked.id), earlier.getTime());
  });

  it("builds the funnel from matured mails with last-touch purchases only", async () => {
    for (const k of ["fA", "fB", "fC", "fD"]) await mk(k, { lastActiveAt: new Date() });
    const log = (userId: number, campaign: string, step: number, sentAt: Date, extra: Record<string, unknown> = {}) =>
      m.prisma.emailCampaignLog.create({ data: { userId, campaign, step, sentAt, ...extra } });
    const buy = (userId: number, createdAt: Date, price = 100) =>
      m.prisma.planPurchase.create({ data: { userId, plan: "PRO", months: 4, price, startsAt: createdAt, endsAt: new Date(createdAt.getTime() + 120 * DAY), createdAt } });
    // A: mời Pro 10 ngày trước, đã bấm, mua 8 ngày trước -> tính (cột quay lại có giá trị nhưng chỉ winback mới hiện)
    await log(ids.fA!, "pro_upsell", 1, daysAgo(10), { clickedAt: daysAgo(9.9), returnedAt: daysAgo(9) });
    await buy(ids.fA!, daysAgo(8));
    // B: mời Pro 12 ngày trước rồi nhắc hết hạn 10 ngày trước, mua 9 ngày trước -> chỉ tính cho thư gần nhất (nhắc hết hạn)
    await log(ids.fB!, "pro_upsell", 1, daysAgo(12));
    await log(ids.fB!, "pro_expiry", 1, daysAgo(10));
    await buy(ids.fB!, daysAgo(9));
    // C: thư 3 ngày trước, mua sau đó -> còn chờ kết quả, không vào phễu
    await log(ids.fC!, "pro_upsell", 1, daysAgo(3));
    await buy(ids.fC!, daysAgo(2));
    // D: được tặng Pro (không trả tiền) trong 7 ngày, mua trả tiền quá 7 ngày sau thư -> không tính
    await log(ids.fD!, "pro_upsell", 1, daysAgo(20));
    await m.prisma.user.update({ where: { id: ids.fD! }, data: { proExpiresAt: new Date(Date.now() + 30 * DAY) } });
    await buy(ids.fD!, daysAgo(18), 0);
    await buy(ids.fD!, daysAgo(12));

    const { funnel, status } = await m.stats.overview();
    assert.deepEqual(funnel.pro_upsell, { sent: 3, clicked: 1, bought: 1, returned: 0, pending: 1 });
    assert.deepEqual(funnel.pro_expiry, { sent: 1, clicked: 0, bought: 1, returned: 0, pending: 0 });
    assert.equal(status.paused, false);
    assert.ok(status.sentToday >= 2); // thư giữ chỗ hôm nay ở các test trên
    assert.ok(Date.parse(status.nextRun) > Date.now());
    assert.ok(status.optOutRate > 0 && status.optOutRate < 1);
  });

  it("sends nothing while paused", async () => {
    await m.settings.setEnabled("pro_expiry", true);
    await m.settings.setPaused(true);
    try {
      const logsBefore = await m.prisma.emailCampaignLog.count();
      const outboxBefore = outbox.length;
      assert.deepEqual(await m.campaigns.run(), { winback: 0, pro_upsell: 0, pro_expiry: 0 });
      assert.equal(await m.prisma.emailCampaignLog.count(), logsBefore);
      assert.equal(outbox.length, outboxBefore);
      assert.equal((await m.stats.overview()).status.paused, true);
    } finally {
      await m.settings.setPaused(false);
      await m.settings.setEnabled("pro_expiry", false);
    }
  });

  it("stops at once when paused in the middle of a run", async () => {
    const expiresAt = new Date(Date.now() + 5 * DAY);
    for (const key of ["pauseA", "pauseB"]) {
      await m.prisma.user.create({ data: { email: `${key}@test.local`, fullName: key, password: "x", emailVerifiedAt: daysAgo(200), createdAt: daysAgo(200), proExpiresAt: expiresAt } });
    }
    await m.settings.setEnabled("pro_expiry", true);
    const original = m.mail.sendMarketing;
    m.mail.sendMarketing = async (to, mail, url) => {
      await original(to, mail, url);
      await m.settings.setPaused(true); // admin bấm tạm dừng ngay sau thư đầu tiên
    };
    try {
      const before = outbox.length;
      await m.campaigns.run();
      assert.equal(outbox.length - before, 1);
    } finally {
      m.mail.sendMarketing = original;
      await m.settings.setPaused(false);
      await m.settings.setEnabled("pro_expiry", false);
    }
  });
});
