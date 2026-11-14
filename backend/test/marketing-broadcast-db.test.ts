import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Gửi thủ công và nhật ký thư trên MySQL thật (TEST_DB=1). Hàm gửi thư bị thay bằng hộp thư giả: không gửi thư thật.

const loadModules = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  campaigns: (await import("../src/services/marketing-campaign.service")).marketingCampaignService,
  broadcasts: (await import("../src/services/marketing-broadcast.service")).marketingBroadcastService,
  repo: (await import("../src/repositories/marketing.repository")).marketingRepository,
  settings: (await import("../src/services/marketing-setting.service")).marketingSettingService,
  stats: (await import("../src/services/marketing-stats.service")).marketingStatsService,
  mail: (await import("../src/services/mail.service")).mailService,
});

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);
const status = (code: number) => (e: { status?: number }) => e.status === code;
type Draft = { subject: string; body: string; ctaLabel: string; ctaPath: string; segment: "all" | "pro" | "free" | "inactive" | "exam_soon"; segmentDays?: number };
const draft = (patch: Partial<Draft> = {}): Draft => ({ subject: "Tin mới", body: "Đoạn một\n\nĐoạn hai", ctaLabel: "Xem ngay", ctaPath: "/pro", segment: "all", ...patch });

describe("marketing broadcasts and log (MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof loadModules>>;
  const ids: Record<string, number> = {};
  const outbox: { to: string; subject: string; html: string }[] = [];
  let mk: (key: string, data?: Record<string, unknown>) => Promise<number>;
  let admin: { id: number; email: string; fullName: string; proExpiresAt: Date | null };
  const logs = () => m.prisma.emailCampaignLog.count();

  before(async () => {
    db = await createThrowawayDb();
    m = await loadModules();
    m.mail.sendMarketing = async (to, mail) => {
      outbox.push({ to, subject: mail.subject, html: mail.html });
    };
    mk = async (key, data = {}) => {
      const u = await m.prisma.user.create({ data: { email: `${key}@test.local`, fullName: key, password: "x", emailVerifiedAt: daysAgo(200), createdAt: daysAgo(200), lastActiveAt: new Date(), ...data } });
      return (ids[key] = u.id);
    };
    await mk("bFree");
    await mk("bPro", { proExpiresAt: new Date(Date.now() + 60 * DAY) });
    await mk("bInactive", { lastActiveAt: daysAgo(40) });
    await mk("bExam", { examDate: new Date(Date.now() + 10 * DAY) });
    await mk("bRecent"); // vừa nhận thư khác 2 ngày trước: giới hạn 1 thư / 7 ngày
    await m.prisma.emailCampaignLog.create({ data: { userId: ids.bRecent!, campaign: "winback", step: 1, sentAt: daysAgo(2) } });
    await mk("bOpt", { marketingOptOut: true });
    await mk("bMuted", { marketingMutedTopics: 8 }); // tắt "news"
    await mk("bPaused", { marketingMutedUntil: new Date(Date.now() + 10 * DAY) });
    await mk("bUnverified", { emailVerifiedAt: null });
    await mk("bBanned", { status: "BANNED" });
    const a = await m.prisma.user.create({ data: { email: "boss@test.local", fullName: "Boss", password: "x", role: "ADMIN", emailVerifiedAt: daysAgo(200) } });
    admin = { id: a.id, email: a.email, fullName: a.fullName, proExpiresAt: null };
  });

  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
  });

  it("estimates each segment without the excluded users", async () => {
    const est = async (d: Draft) => (await m.broadcasts.estimate((await m.broadcasts.create(d, admin.id)).id)).recipients;
    assert.equal(await est(draft()), 5); // bFree, bPro, bInactive, bExam, bRecent (ước tính chưa trừ khoảng cách giữa hai thư)
    assert.equal(await est(draft({ segment: "pro" })), 1);
    assert.equal(await est(draft({ segment: "free" })), 4);
    assert.equal(await est(draft({ segment: "inactive", segmentDays: 30 })), 1);
    assert.equal(await est(draft({ segment: "inactive", segmentDays: 60 })), 0);
    assert.equal(await est(draft({ segment: "exam_soon" })), 1);
    const b = await m.broadcasts.create(draft({ segment: "pro", segmentDays: 30 }), admin.id);
    assert.equal(b.segmentDays, null); // số ngày chỉ dùng cho nhóm không hoạt động
    assert.deepEqual(await m.broadcasts.estimate(b.id), { recipients: 1, days: 1 });
    // dọn: các bản nháp trên không được chạy
    for (const { id } of (await m.broadcasts.list({ page: 1, limit: 50 })).items) await m.broadcasts.cancel(id);
  });

  it("sends a test only to the calling admin and writes no log", async () => {
    const b = await m.broadcasts.create(draft({ body: "<b>hi</b>" }), admin.id);
    const [before, sent] = [await logs(), outbox.length];
    assert.deepEqual(await m.broadcasts.sendTest(b.id, admin as never), { sent: 1, to: admin.email });
    assert.equal(outbox.length, sent + 1);
    assert.equal(outbox.at(-1)!.to, admin.email);
    assert.ok(outbox.at(-1)!.subject.startsWith("[Thử]"));
    assert.ok(outbox.at(-1)!.html.includes("&lt;b&gt;hi&lt;/b&gt;"));
    assert.equal(await logs(), before);
    await m.broadcasts.cancel(b.id);
  });

  it("previews with a fake recipient, inlined images and escaped text", async () => {
    const b = await m.broadcasts.create(draft({ subject: "Xem <thử>", body: "<img src=x onerror=alert(1)>" }), admin.id);
    const before = await logs();
    const { subject, html } = await m.broadcasts.preview(b.id);
    assert.equal(subject, "Xem <thử>");
    assert.equal(html.includes("cid:"), false);
    assert.ok(html.includes("data:image/png;base64,"));
    assert.equal(html.includes("<img src=x"), false);
    assert.ok(html.includes("&amp;c=news"));
    assert.equal(/@test\.local|Boss/.test(html), false); // không có dữ liệu của người thật
    assert.equal(await logs(), before);
    await assert.rejects(m.broadcasts.preview(999_999), status(404));
    await m.broadcasts.cancel(b.id);
  });

  let main: number;

  it("starts only with the confirm word, only from DRAFT, one SENDING at a time", async () => {
    main = (await m.broadcasts.create(draft(), admin.id)).id;
    const other = (await m.broadcasts.create(draft({ subject: "Khác" }), admin.id)).id;
    await assert.rejects(m.broadcasts.start(main, undefined), status(400));
    await assert.rejects(m.broadcasts.start(main, "GUI"), status(400));
    await assert.rejects(m.broadcasts.start(main, "gửi"), status(400));
    assert.equal((await m.prisma.marketingBroadcast.findUniqueOrThrow({ where: { id: main } })).status, "DRAFT");
    assert.equal((await m.broadcasts.start(main, "GỬI")).status, "SENDING");
    await assert.rejects(m.broadcasts.start(other, "GỬI"), status(409)); // đã có đợt đang gửi
    await assert.rejects(m.broadcasts.start(main, "GỬI"), status(409)); // không còn là bản nháp
    const cancelled = (await m.broadcasts.list({ page: 1, limit: 50 })).items.find((b) => b.status === "CANCELLED")!;
    await assert.rejects(m.broadcasts.start(cancelled.id, "GỬI"), status(409));
    await assert.rejects(m.broadcasts.start(999_999, "GỬI"), status(404));
    await m.broadcasts.cancel(other);
  });

  it("goes through the daily cap, skips the 7-day gap and excluded users, each user once, then finishes", async () => {
    const campaign = `broadcast:${main}`;
    const got = () => m.prisma.emailCampaignLog.findMany({ where: { campaign }, select: { userId: true, step: true, target: true } });
    try {
      await m.settings.setParams({ dailyCap: 2 });
      assert.deepEqual(await m.campaigns.run(), { pro_expiry: 0, broadcast: 2, pro_upsell: 0, winback: 0 });
      assert.equal((await m.campaigns.run()).broadcast, 0); // hạn mức ngày tính cả thư gửi thủ công
      assert.equal((await m.stats.overview()).status.sentToday, 2);
      await m.settings.resetParams();
      assert.equal((await m.campaigns.run()).broadcast, 2);
      assert.equal((await m.campaigns.run()).broadcast, 0);
      const first = await got();
      assert.deepEqual(first.map((l) => l.userId).sort(), [ids.bFree!, ids.bPro!, ids.bInactive!, ids.bExam!].sort());
      assert.ok(first.every((l) => l.step === 1 && l.target === "/pro"));
      assert.equal((await m.prisma.marketingBroadcast.findUniqueOrThrow({ where: { id: main } })).status, "SENDING"); // bRecent còn chờ hết khoảng cách

      // Hết khoảng cách 7 ngày: bRecent nhận ở lượt sau, rồi không còn ai -> DONE
      await m.prisma.emailCampaignLog.updateMany({ where: { userId: ids.bRecent!, campaign: "winback" }, data: { sentAt: daysAgo(10) } });
      // thư gửi thủ công hôm nay của người khác cũng chặn họ nhận chiến dịch tự động: chỉ bRecent đủ điều kiện
      assert.equal((await m.campaigns.run()).broadcast, 1);
      assert.equal((await got()).length, 5);
      assert.equal((await m.campaigns.run()).broadcast, 0);
      assert.equal((await m.prisma.marketingBroadcast.findUniqueOrThrow({ where: { id: main } })).status, "DONE");
      const list = (await m.broadcasts.list({ page: 1, limit: 50 })).items.find((b) => b.id === main)!;
      assert.equal(list.sent, 5);
      assert.equal(list.clicked, 0);
      const { funnel } = await m.stats.overview();
      assert.equal(funnel.broadcast.pending, 5);
    } finally {
      await m.settings.resetParams();
    }
  });

  it("rechecks opt-out, muted news, pause and a stop just before sending", async () => {
    const b = (await m.broadcasts.create(draft(), admin.id)).id;
    await m.broadcasts.start(b, "GỬI");
    const campaign = `broadcast:${b}` as const;
    const u = await mk("lateB");
    const set = (data: Record<string, unknown>) => m.prisma.user.update({ where: { id: u }, data });
    await set({ marketingMutedTopics: 8 });
    assert.equal(await m.repo.claim(u, campaign, 1, "/pro"), null);
    await set({ marketingMutedTopics: 0, marketingMutedUntil: new Date(Date.now() + DAY) });
    assert.equal(await m.repo.claim(u, campaign, 1, "/pro"), null); // tạm dừng chặn gửi thủ công
    await set({ marketingMutedUntil: null, marketingOptOut: true });
    assert.equal(await m.repo.claim(u, campaign, 1, "/pro"), null);
    await set({ marketingOptOut: false });

    // Dừng giữa lượt chạy: thư còn lại trong lô không đi
    await mk("lateC");
    const original = m.mail.sendMarketing;
    m.mail.sendMarketing = async (to, mail, url) => {
      await original(to, mail, url);
      await m.broadcasts.cancel(b);
    };
    try {
      assert.equal((await m.campaigns.run()).broadcast, 1);
    } finally {
      m.mail.sendMarketing = original;
    }
    assert.equal(await m.repo.claim(u, campaign, 1, "/pro"), null); // đã dừng
    await assert.rejects(m.broadcasts.cancel(b), status(409));
  });

  it("lists the log with filters, pagination, last-touch purchases and returns", async () => {
    const u = await mk("logUser");
    const at = (n: number) => daysAgo(n);
    const w = await m.prisma.emailCampaignLog.create({ data: { userId: u, campaign: "winback", step: 2, sentAt: at(20), returnedAt: at(19) } });
    const x = await m.prisma.emailCampaignLog.create({ data: { userId: u, campaign: "pro_upsell", step: 20_000 * 10 + 1, sentAt: at(15), clickedAt: at(14.9) } });
    await m.prisma.planPurchase.create({ data: { userId: u, plan: "PRO", months: 4, price: 100, startsAt: at(14), endsAt: at(-100), createdAt: at(14) } });

    const page = (q: Record<string, unknown>) => m.stats.logs({ page: 1, limit: 20, ...q } as never);
    const mine = await page({ email: "logUser" });
    assert.equal(mine.total, 2);
    assert.deepEqual(
      mine.items.map((r) => [r.id, r.campaign, r.step, r.clicked, r.bought, r.returned]),
      [
        [x.id, "pro_upsell", 1, true, true, false],
        [w.id, "winback", 2, false, false, true], // mua sau thư mới hơn: chỉ tính cho thư gần nhất
      ],
    );
    assert.equal(mine.items[0]!.email, "logUser@test.local");

    assert.equal((await page({ email: "_" })).total, 0); // ký tự đại diện LIKE được hiểu đúng nghĩa đen
    assert.equal((await page({ email: "%" })).total, 0);
    assert.equal((await page({ campaign: "winback", email: "loguser" })).total, 1);
    const all = await page({ campaign: "broadcast" });
    assert.equal(all.total, 6);
    assert.ok(all.items.every((r) => r.campaign.startsWith("broadcast:")));
    assert.equal((await page({ campaign: `broadcast:${main}` })).total, 5);

    const vnDay = (d: Date) => new Date(new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10) + "T00:00:00+07:00");
    assert.equal((await page({ email: "logUser", from: vnDay(at(16)), to: vnDay(at(15)) })).total, 1); // `to` gồm cả ngày đó
    assert.equal((await page({ email: "logUser", from: vnDay(at(10)) })).total, 0);

    const total = (await page({})).total;
    const p1 = await m.stats.logs({ page: 1, limit: 3 } as never);
    const p2 = await m.stats.logs({ page: 2, limit: 3 } as never);
    assert.equal(p1.items.length, 3);
    assert.equal(p1.total, total);
    assert.equal(new Set([...p1.items, ...p2.items].map((r) => r.id)).size, p1.items.length + p2.items.length);
    assert.ok(p1.items[0]!.id > p2.items[0]!.id);
  });
});
