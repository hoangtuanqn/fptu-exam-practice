import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Links in mails sent before migration 0080 carry the old INT user id (TEST_DB=1). Modules touching the DB are imported
// dynamically after DATABASE_URL points at the throwaway database.
describe("old mail links (numeric user id) after migration 0080", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb | undefined;
  let prisma: typeof import("../src/configs/prisma").prisma;
  // As built by 0080 for old id 42 (0x02a): "-7000-802a-"; a later user whose random bits collide sorts after it
  const MIGRATED = "018cc251-f400-7000-802a-4f699b794435";
  const LATER = "019a0000-0000-7000-802a-000000000001";

  before(async () => {
    db = await createThrowawayDb();
    prisma = (await import("../src/configs/prisma")).prisma;
    for (const [id, email] of [[LATER, "later@t.local"], [MIGRATED, "old@t.local"]] as const) {
      await prisma.user.create({ data: { id, email, fullName: email, password: "x", reminderEnabled: true } });
    }
  });
  after(async () => {
    await prisma?.$disconnect();
    await db?.drop();
  });

  it("finds the migrated user from the old id bits", async () => {
    const { userRepository } = await import("../src/repositories/user.repository");
    assert.equal(await userRepository.findIdByLegacyId(42), MIGRATED);
    assert.equal(await userRepository.findIdByLegacyId(43), null);
    assert.equal(await userRepository.findIdByLegacyId(2 ** 24), null);
  });

  it("an old reminder unsubscribe link still turns reminders off for the right user", async () => {
    const secret = (await import("../src/configs/env")).env.JWT_SECRET;
    const { reminderService } = await import("../src/services/reminder.service");
    const sig = (id: string) => crypto.createHmac("sha256", secret).update(`reminder-unsubscribe:${id}`).digest("hex").slice(0, 32);
    assert.equal(await reminderService.unsubscribe("42", "0".repeat(32)), false);
    assert.equal(await reminderService.unsubscribe("42", sig("42")), true);
    const rows = await prisma.user.findMany({ select: { id: true, reminderEnabled: true }, orderBy: { id: "asc" } });
    assert.deepEqual(rows, [{ id: MIGRATED, reminderEnabled: false }, { id: LATER, reminderEnabled: true }]);
  });
});
