import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Xoá tài khoản trên MySQL thật (TEST_DB=1): xác nhận, chặn, huỷ khi đăng nhập lại, ẩn danh sau thời gian chờ, không tặng quà lần nữa.

const loadModules = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  svc: (await import("../src/services/account-deletion.service")).accountDeletionService,
  auth: (await import("../src/services/auth.service")).authService,
  account: (await import("../src/services/account-setting.service")).accountSettingService,
});

const status = (code: number) => (err: unknown) => (err as { status?: number }).status === code;
const DAY = 24 * 60 * 60 * 1000;
const PASSWORD = "matkhau123";

describe("account deletion (MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof loadModules>>;
  let me: string;

  before(async () => {
    db = await createThrowawayDb();
    m = await loadModules();
    await m.account.update({ signupCredit: 50 });
    me = (await m.auth.register({ email: "me@test.local", fullName: "Nguyen Van A", password: PASSWORD })).user.id;
    await m.prisma.studyDay.create({ data: { userId: me, day: new Date("2026-01-01") } });
    await m.prisma.chatLog.create({ data: { userId: me, question: "secret", ip: "10.0.0.1", matched: false, cached: false } });
  });

  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
  });

  const row = () => m.prisma.user.findUniqueOrThrow({ where: { id: me } });

  it("needs the right confirmation and refuses impersonation and open deposits", async () => {
    await assert.rejects(m.svc.request(me, false, { password: "sai" }), status(400));
    await assert.rejects(m.svc.request(me, false, { email: "me@test.local" }), status(400)); // không có Google/GitHub
    await assert.rejects(m.svc.request(me, true, { password: PASSWORD }), status(403));
    const order = await m.prisma.depositOrder.create({ data: { userId: me, code: "NAPTEST0001", amount: 10000, expiresAt: new Date(Date.now() + DAY) } });
    await assert.rejects(m.svc.request(me, false, { password: PASSWORD }), status(409));
    await m.prisma.depositOrder.delete({ where: { id: order.id } });
    assert.equal((await row()).deleteRequestedAt, null);
  });

  it("signing in again during the grace period cancels the request", async () => {
    await m.svc.request(me, false, { password: PASSWORD });
    assert.ok((await row()).deleteRequestedAt);
    assert.equal(await m.svc.runDue(), 0); // chưa hết hạn
    const login = await m.auth.login({ email: "me@test.local", password: PASSWORD }, "127.0.0.1");
    assert.equal(login.deletionCancelled, true);
    assert.equal((await row()).deleteRequestedAt, null);
    assert.equal(await m.svc.runDue(Date.now() + 30 * DAY), 0);
  });

  it("erases personal data after the grace period, keeps the ledger balanced", async () => {
    await m.svc.request(me, false, { password: PASSWORD });
    assert.equal(await m.svc.runDue(Date.now() + 15 * DAY), 1);
    const u = await row();
    assert.equal(u.email, `deleted-${me}@deleted.invalid`);
    assert.equal(u.balance, 0);
    assert.ok(u.deletedAt && u.deletedEmailHash);
    assert.equal(await m.prisma.studyDay.count({ where: { userId: me } }), 0);
    assert.deepEqual(await m.prisma.chatLog.findFirst({ where: { userId: me }, select: { question: true, ip: true } }), { question: "", ip: null });
    const sum = await m.prisma.walletTransaction.aggregate({ where: { userId: me }, _sum: { amount: true } });
    assert.equal(sum._sum.amount, 0);
    assert.equal(await m.svc.runDue(Date.now() + 16 * DAY), 0); // chạy lại không đụng gì
    await assert.rejects(m.auth.login({ email: "me@test.local", password: PASSWORD }, "127.0.0.1"), status(401));
  });

  it("the same email can register again but gets no signup credit", async () => {
    const again = await m.auth.register({ email: "me@test.local", fullName: "A", password: PASSWORD });
    assert.equal(again.user.balance, 0);
    const other = await m.auth.register({ email: "other@test.local", fullName: "B", password: PASSWORD });
    assert.equal(other.user.balance, 50);
  });
});
