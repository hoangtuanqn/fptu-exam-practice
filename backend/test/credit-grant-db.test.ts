import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Cộng credit hàng loạt: chỉ thành viên đang hoạt động, có thông báo trên chuông, chạy lại không cộng trùng (TEST_DB=1, MySQL dùng một lần).

const load = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  grant: (await import("../src/services/credit-grant.service")).creditGrantService,
});

describe("grant credit to all (throwaway MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof load>>;
  let a: string, b: string, banned: string;
  const note = "Đền bù bảo trì thử nghiệm";
  const balance = async (id: string) => (await m.prisma.user.findUniqueOrThrow({ where: { id } })).balance;

  before(async () => {
    db = await createThrowawayDb();
    m = await load();
    const user = async (key: string, status: "ACTIVE" | "BANNED" = "ACTIVE") =>
      (await m.prisma.user.create({ data: { email: `${key}@example.invalid`, fullName: key, password: "x", status, balance: 10 } })).id;
    a = await user("a");
    b = await user("b");
    banned = await user("c", "BANNED");
  });
  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
  });

  it("dry-run writes nothing", async () => {
    const r = await m.grant.grantToAllActive({ amount: 2000, note, dryRun: true });
    assert.deepEqual(r, { eligible: 2, granted: 2, skipped: 0, failed: 0 });
    assert.equal(await balance(a), 10);
    assert.equal(await m.prisma.walletTransaction.count(), 0);
  });

  it("grants active members only, with a ledger row and a bell notice", async () => {
    const r = await m.grant.grantToAllActive({ amount: 2000, note, dryRun: false });
    assert.deepEqual(r, { eligible: 2, granted: 2, skipped: 0, failed: 0 });
    assert.equal(await balance(a), 2010);
    assert.equal(await balance(b), 2010);
    assert.equal(await balance(banned), 10);
    const entry = await m.prisma.walletTransaction.findFirstOrThrow({ where: { userId: a } });
    assert.equal(entry.type, "ADMIN_ADJUST");
    assert.equal(entry.amount, 2000);
    assert.equal(entry.balanceAfter, 2010);
    const notices = await m.prisma.userNotice.findMany({ where: { userId: a } });
    assert.equal(notices.length, 1);
    assert.match(notices[0]!.body ?? "", /Đền bù bảo trì thử nghiệm/);
  });

  it("running again with the same note grants nothing twice; a new note is a new round", async () => {
    const again = await m.grant.grantToAllActive({ amount: 2000, note, dryRun: false });
    assert.deepEqual(again, { eligible: 2, granted: 0, skipped: 2, failed: 0 });
    assert.equal(await balance(a), 2010);

    const next = await m.grant.grantToAllActive({ amount: 500, note: `${note} 2`, dryRun: false });
    assert.equal(next.granted, 2);
    assert.equal(await balance(a), 2510);
  });
});
