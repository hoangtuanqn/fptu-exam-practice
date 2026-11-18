import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Money rows and subjects use UUID v7 ids since migration 0081 (TEST_DB=1). Modules touching the DB are imported
// dynamically after DATABASE_URL points at the throwaway database.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
// The SePay sync mails the depositor and the referrer: never send real mail from tests (env is read on first import)
process.env.SMTP_USER = "";
process.env.SMTP_PASS = "";

describe("UUID money rows and subjects (migration 0081)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb | undefined;
  let prisma: typeof import("../src/configs/prisma").prisma;
  let referrerId = "";
  let depositorId = "";

  before(
    async () => {
      db = await createThrowawayDb();
      prisma = (await import("../src/configs/prisma")).prisma;
      referrerId = (await prisma.user.create({ data: { email: "ref@t.local", fullName: "Ref", password: "x" } })).id;
      depositorId = (await prisma.user.create({ data: { email: "dep@t.local", fullName: "Dep", password: "x", referredById: referrerId } })).id;
      await prisma.setting.createMany({
        data: [
          { key: "sepay.apiToken", value: "test-token" },
          { key: "sepay.accountNumber", value: "000" },
        ],
      });
    },
    { timeout: 300_000 },
  );
  after(async () => {
    await prisma?.$disconnect();
    await db?.drop();
  });

  // The ledger must always explain the balance: last balance_after = users.balance = sum of amounts
  const assertLedger = async (userId: string) => {
    const [user, rows] = await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { balance: true } }),
      prisma.walletTransaction.findMany({ where: { userId }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }),
    ]);
    assert.ok(rows.every((r) => UUID.test(r.id)));
    assert.equal(rows.reduce((s, r) => s + r.amount, 0), user.balance);
    assert.equal(rows.at(-1)?.balanceAfter ?? 0, user.balance);
  };

  it("SePay matches the deposit by its code and links bank row + referral reward to the UUID order id, once", async () => {
    const { depositRepository } = await import("../src/repositories/deposit.repository");
    const { sepayClient } = await import("../src/services/sepay.client");
    const { sepayService } = await import("../src/services/sepay.service");
    const order = await depositRepository.create({ userId: depositorId, code: "NAPTEST2345", amount: 50_000, expiresAt: new Date(Date.now() + 60_000) });
    assert.match(order.id, UUID);

    const tx = (id: string, content: string) => ({ id, bank_brand_name: "MB", account_number: "000", transaction_date: "2026-01-01 10:00:00", amount_in: "50000.00", transaction_content: content, reference_number: null });
    sepayClient.listTransactions = async () => [tx("9001", "chuyen tien naptest 2345"), tx("9002", "no code here")];
    const first = await sepayService.sync();
    assert.deepEqual({ ok: first.ok, created: first.created, matched: first.matched }, { ok: true, created: 2, matched: 1 });
    const again = await sepayService.sync(); // same transactions: nothing new, no double credit
    assert.deepEqual({ created: again.created, matched: again.matched }, { created: 0, matched: 0 });

    const bank = await prisma.bankTransaction.findMany({ orderBy: { sepayId: "asc" }, select: { sepayId: true, status: true, depositOrderId: true } });
    assert.deepEqual(bank, [
      { sepayId: "9001", status: "MATCHED", depositOrderId: order.id },
      { sepayId: "9002", status: "UNMATCHED", depositOrderId: null },
    ]);
    assert.equal((await prisma.depositOrder.findUniqueOrThrow({ where: { id: order.id } })).status, "PAID");
    const rewards = await prisma.referralReward.findMany({ select: { depositOrderId: true, referrerId: true, amount: true } });
    assert.deepEqual(rewards, [{ depositOrderId: order.id, referrerId, amount: 10_000 }]);
    await assertLedger(depositorId);
    await assertLedger(referrerId);
  });

  it("spending uses expiring credit lots first and the expiry job works with UUID lot ids", async () => {
    const { creditLotRepository } = await import("../src/repositories/credit-lot.repository");
    const { creditLotService } = await import("../src/services/credit-lot.service");
    const { walletService } = await import("../src/services/wallet.service");
    const soon = new Date(Date.now() + 1000);
    const later = new Date(Date.now() + 86_400_000);
    const [a, b] = await prisma.$transaction(async (t) => {
      await walletService.applyChange(t, { userId: referrerId, amount: 300, type: "GIFT_CODE" });
      return [
        await creditLotRepository.create(t, { userId: referrerId, source: "GIFT_CODE", amount: 100, expiresAt: later }),
        await creditLotRepository.create(t, { userId: referrerId, source: "GIFT_CODE", amount: 200, expiresAt: soon }),
      ];
    });
    assert.match(a.id, UUID);
    await prisma.$transaction((t) => walletService.charge(t, { userId: referrerId, amount: 150, type: "PLAN_CHARGE" }));
    const left = async (id: string) => (await prisma.creditLot.findUniqueOrThrow({ where: { id } })).remaining;
    assert.equal(await left(b.id), 50); // soonest expiry spent first
    assert.equal(await left(a.id), 100);

    await new Promise((r) => setTimeout(r, 1100));
    assert.deepEqual(await creditLotService.expireDue(), { lots: 1, credit: 50 });
    assert.equal(await left(b.id), 0);
    assert.equal(await creditLotService.expireLot(b.id, referrerId), 0); // idempotent
    await assertLedger(referrerId);
  });

  it("subjects get UUID ids; scripts resolve a subject by UUID or by code", async () => {
    const { subjectRepository } = await import("../src/repositories/subject.repository");
    const s = await prisma.subject.create({ data: { code: "UID101", name: "Uuid subject" } });
    assert.match(s.id, UUID);
    assert.equal((await subjectRepository.findByIdOrCode(s.id.toUpperCase()))?.code, "UID101");
    assert.equal((await subjectRepository.findByIdOrCode("uid101"))?.id, s.id);
    assert.equal(await subjectRepository.findByIdOrCode("1"), null);
    await prisma.subjectChapter.create({ data: { subjectId: s.id, number: 1, title: "Intro", topics: [] } });
    assert.deepEqual((await subjectRepository.chapters(s.id)).map((c) => c.title), ["Intro"]);
  });
});
