import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

const load = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  service: (await import("../src/services/coursera.service")).courseraService,
});
const page = { page: 1, limit: 20 };
const hasStatus = (status: number) => (error: unknown) => (error as { status?: number }).status === status;

describe("Coursera orders (throwaway MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof load>>;
  let userId: number, otherId: number, courseId: number;
  const previousKey = process.env.COURSERA_ENCRYPTION_KEY;
  before(async () => {
    db = await createThrowawayDb(); m = await load();
    process.env.COURSERA_ENCRYPTION_KEY = randomBytes(32).toString("hex");
    userId = (await m.prisma.user.create({ data: { email: "coursera@example.invalid", fullName: "Test", password: "test" } })).id;
    otherId = (await m.prisma.user.create({ data: { email: "other@example.invalid", fullName: "Other", password: "test" } })).id;
    courseId = (await m.service.saveCourse({ title: "Original course", url: "https://www.coursera.org/learn/test", isActive: true })).id;
  });
  after(async () => {
    if (previousKey === undefined) delete process.env.COURSERA_ENCRYPTION_KEY; else process.env.COURSERA_ENCRYPTION_KEY = previousKey;
    await m?.prisma.$disconnect(); await db?.drop();
  });
  const input = () => ({ courseId, requestKey: randomUUID(), email: "learner@example.invalid", password: "test secret", note: "Example note" });
  it("deduplicates concurrent requests, isolates history, snapshots the course and hides credentials", async () => {
    const body = input();
    const [a, b] = await Promise.all([m.service.createOrder(userId, body), m.service.createOrder(userId, body)]);
    assert.equal(a.id, b.id);
    assert.equal("encryptedPassword" in a, false);
    const stored = await m.prisma.courseraOrder.findUniqueOrThrow({ where: { id: a.id } });
    assert.notEqual(stored.encryptedPassword, body.password);
    assert.equal((await m.service.orders(page, otherId)).meta.total, 0);
    await assert.rejects(m.service.cancel(a.id, otherId), hasStatus(409));
    await m.service.saveCourse({ title: "Renamed", url: "https://www.coursera.org/learn/test", isActive: true }, courseId);
    assert.equal((await m.service.orders(page, userId)).items[0]!.courseTitle, "Original course");
    assert.equal((await m.service.credentials(a.id, otherId)).password, body.password);
    assert.equal((await m.prisma.courseraOrder.findUniqueOrThrow({ where: { id: a.id } })).credentialViewedBy, otherId);
    await m.service.cancel(a.id, userId);
    assert.equal((await m.prisma.courseraOrder.findUniqueOrThrow({ where: { id: a.id } })).encryptedPassword, null);
    await assert.rejects(m.service.credentials(a.id, otherId), hasStatus(404));
  });
  it("rejects inactive courses and stale or terminal status changes", async () => {
    const order = await m.service.createOrder(userId, input());
    await m.service.updateStatus(order.id, { expectedStatus: "PENDING", status: "PROCESSING", adminNote: "Processing" });
    await assert.rejects(m.service.cancel(order.id, userId), hasStatus(409));
    await assert.rejects(m.service.updateStatus(order.id, { expectedStatus: "PENDING", status: "REJECTED", adminNote: "" }), hasStatus(409));
    await m.service.updateStatus(order.id, { expectedStatus: "PROCESSING", status: "COMPLETED", adminNote: "Done" });
    await assert.rejects(m.service.updateStatus(order.id, { expectedStatus: "COMPLETED", status: "PROCESSING", adminNote: "" }), hasStatus(409));
    assert.equal((await m.prisma.courseraOrder.findUniqueOrThrow({ where: { id: order.id } })).encryptedPassword, null);
    await m.service.saveCourse({ title: "Paused", url: "https://www.coursera.org/learn/test", isActive: false }, courseId);
    assert.equal((await m.service.courses({ ...page, q: "" })).meta.total, 0);
    assert.equal((await m.service.courses({ ...page, q: "Paused" }, true)).meta.total, 1);
    await assert.rejects(m.service.createOrder(userId, input()), hasStatus(409));
  });
});
