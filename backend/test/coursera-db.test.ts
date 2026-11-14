import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

const load = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  service: (await import("../src/services/coursera.service")).courseraService,
  notices: (await import("../src/services/admin-notice.service")).adminNoticeService,
  mail: (await import("../src/services/mail.service")).mailService,
  legacy: (await import("../src/utils/coursera-credentials")).encryptCourseraPassword,
});
type Push = { kind: string; title: string; body?: string | null; userId?: number | null };
type Mail = { to: string; event: string; amount: number; balanceAfter: number | null; text: string };
const page = { page: 1, limit: 20 };
const hasStatus = (status: number) => (error: unknown) => (error as { status?: number }).status === status;

describe("Coursera orders (throwaway MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof load>>;
  let userId: number, otherId: number, courseId: number;
  const pushes: Push[] = [];
  const mails: Mail[] = [];
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50)); // mails resolve the user before sending
  const previousKey = process.env.COURSERA_ENCRYPTION_KEY;
  before(async () => {
    db = await createThrowawayDb(); m = await load();
    process.env.COURSERA_ENCRYPTION_KEY = randomBytes(32).toString("hex"); // only for the legacy "v1." row test
    m.notices.push = (kind, input) => { pushes.push({ kind, ...input }); };
    m.mail.sendCourseraOrder = async (to, input) => {
      const { renderCourseraOrderEmail } = await import("../src/mail/templates/coursera-notice");
      mails.push({ to, event: input.event, amount: input.amount, balanceAfter: input.balanceAfter, text: renderCourseraOrderEmail(input).text });
    };
    userId = (await m.prisma.user.create({ data: { email: "coursera@example.invalid", fullName: "Test", password: "test" } })).id;
    otherId = (await m.prisma.user.create({ data: { email: "other@example.invalid", fullName: "Other", password: "test" } })).id;
    courseId = (await m.service.saveCourse({ title: "Original course", url: "https://www.coursera.org/learn/test", isActive: true })).id;
  });
  after(async () => {
    if (previousKey === undefined) delete process.env.COURSERA_ENCRYPTION_KEY; else process.env.COURSERA_ENCRYPTION_KEY = previousKey;
    await m?.prisma.$disconnect(); await db?.drop();
  });
  const input = () => ({ courseId, expectedPrice: 0, requestKey: randomUUID(), email: "learner@example.invalid", password: "test secret", note: "Example note" });
  it("deduplicates concurrent requests, isolates history, snapshots the course and hides credentials", async () => {
    const body = input();
    const [a, b] = await Promise.all([m.service.createOrder(userId, body), m.service.createOrder(userId, body)]);
    assert.equal(a.id, b.id);
    assert.equal("password" in a, false);
    const stored = await m.prisma.courseraOrder.findUniqueOrThrow({ where: { id: a.id } });
    assert.equal(stored.password, body.password); // plaintext by owner decision (ADR 0005)
    await settle();
    assert.equal(pushes.filter((p) => p.kind === "coursera.ordered" && p.title.includes(`#${a.id}`)).length, 1);
    assert.equal(mails.filter((x) => x.event === "received").length, 1);
    await m.service.createOrder(userId, body); // sequential retry: no second notice or mail
    await settle();
    assert.equal(pushes.filter((p) => p.kind === "coursera.ordered").length, 1);
    assert.equal(mails.filter((x) => x.event === "received").length, 1);
    assert.equal((await m.service.orders(page, otherId)).meta.total, 0);
    await assert.rejects(m.service.cancel(a.id, otherId), hasStatus(409));
    await m.service.saveCourse({ title: "Renamed", url: "https://www.coursera.org/learn/test", isActive: true }, courseId);
    assert.equal((await m.service.orders(page, userId)).items[0]!.courseTitle, "Original course");
    assert.equal((await m.service.credentials(a.id, otherId)).password, body.password);
    assert.equal((await m.prisma.courseraOrder.findUniqueOrThrow({ where: { id: a.id } })).credentialViewedBy, otherId);
    await m.service.cancel(a.id, userId);
    assert.equal((await m.prisma.courseraOrder.findUniqueOrThrow({ where: { id: a.id } })).password, null);
    await assert.rejects(m.service.credentials(a.id, otherId), hasStatus(404));
    assert.equal(pushes.filter((p) => p.kind === "coursera.cancelled").length, 1);
    for (const value of [...pushes.map((p) => `${p.title} ${p.body ?? ""}`), ...mails.map((x) => x.text)]) assert.equal(value.includes(body.password), false);
  });
  it("charges the catalog price once, rejects stale quotes and insufficient funds, and refunds once", async () => {
    const paidCourse = await m.service.saveCourse({ title: "Paid course", url: "https://www.coursera.org/learn/paid-test", price: 300, isActive: true });
    const buyer = await m.prisma.user.create({ data: { email: "buyer@example.invalid", fullName: "Buyer", password: "test", balance: 1000 } });
    const balance = async () => (await m.prisma.user.findUniqueOrThrow({ where: { id: buyer.id } })).balance;
    const body = { ...input(), courseId: paidCourse.id, expectedPrice: 300 };
    await assert.rejects(m.service.createOrder(buyer.id, { ...body, expectedPrice: 0 }), hasStatus(409));
    assert.equal(await balance(), 1000);
    await assert.rejects(m.service.createOrder(otherId, body), hasStatus(402));
    assert.equal(await m.prisma.courseraOrder.count({ where: { userId: otherId } }), 0);
    const [order, replay] = await Promise.all([m.service.createOrder(buyer.id, body), m.service.createOrder(buyer.id, body)]);
    assert.equal(order.id, replay.id);
    assert.equal(order.amount, 300);
    assert.equal(await balance(), 700);
    assert.equal(await m.prisma.walletTransaction.count({ where: { userId: buyer.id, type: "COURSERA_CHARGE" } }), 1);
    await m.service.saveCourse({ title: paidCourse.title, url: paidCourse.url, isActive: true, price: 500 }, paidCourse.id);
    assert.equal((await m.service.createOrder(buyer.id, body)).id, order.id);
    await assert.rejects(m.service.createOrder(buyer.id, { ...body, requestKey: randomUUID() }), hasStatus(409));
    const cancelled = await Promise.allSettled([m.service.cancel(order.id, buyer.id), m.service.cancel(order.id, buyer.id)]);
    assert.equal(cancelled.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal(await balance(), 1000);
    assert.equal(await m.prisma.walletTransaction.count({ where: { userId: buyer.id, type: "COURSERA_REFUND" } }), 1);
    assert.ok((await m.prisma.courseraOrder.findUniqueOrThrow({ where: { id: order.id } })).refundedAt);

    const next = await m.service.createOrder(buyer.id, { ...body, expectedPrice: 500, requestKey: randomUUID() });
    await m.service.updateStatus(next.id, { expectedStatus: "PENDING", status: "PROCESSING", adminNote: "" });
    await m.service.updateStatus(next.id, { expectedStatus: "PROCESSING", status: "REJECTED", adminNote: "Cannot process" });
    assert.equal(await balance(), 1000);
    const completed = await m.service.createOrder(buyer.id, { ...body, expectedPrice: 500, requestKey: randomUUID() });
    await m.service.updateStatus(completed.id, { expectedStatus: "PENDING", status: "PROCESSING", adminNote: "" });
    await m.service.updateStatus(completed.id, { expectedStatus: "PROCESSING", status: "COMPLETED", adminNote: "Done" });
    assert.equal(await balance(), 500);
    assert.equal(await m.prisma.walletTransaction.count({ where: { userId: buyer.id, type: "COURSERA_REFUND" } }), 2);
  });

  it("rolls back the status change when refunding fails", async () => {
    const course = await m.service.saveCourse({ title: "Refund rollback", url: "https://www.coursera.org/learn/refund-test", price: 10, isActive: true });
    const buyer = await m.prisma.user.create({ data: { email: "rollback@example.invalid", fullName: "Rollback", password: "test", balance: 10 } });
    const order = await m.service.createOrder(buyer.id, { ...input(), courseId: course.id, expectedPrice: 10 });
    // Force a refund overflow to verify that the order update and credential deletion also roll back.
    await m.prisma.user.update({ where: { id: buyer.id }, data: { balance: 2147483647 } });
    await assert.rejects(m.service.cancel(order.id, buyer.id), hasStatus(503));
    const stored = await m.prisma.courseraOrder.findUniqueOrThrow({ where: { id: order.id } });
    assert.equal(stored.status, "PENDING");
    assert.equal(stored.refundedAt, null);
    assert.ok(stored.password);
  });

  it("rejects inactive courses and stale or terminal status changes", async () => {
    const order = await m.service.createOrder(userId, input());
    await m.service.updateStatus(order.id, { expectedStatus: "PENDING", status: "PROCESSING", adminNote: "Processing" });
    await assert.rejects(m.service.cancel(order.id, userId), hasStatus(409));
    await assert.rejects(m.service.updateStatus(order.id, { expectedStatus: "PENDING", status: "REJECTED", adminNote: "" }), hasStatus(409));
    await m.service.updateStatus(order.id, { expectedStatus: "PROCESSING", status: "COMPLETED", adminNote: "Done" });
    await assert.rejects(m.service.updateStatus(order.id, { expectedStatus: "COMPLETED", status: "PROCESSING", adminNote: "" }), hasStatus(409));
    assert.equal((await m.prisma.courseraOrder.findUniqueOrThrow({ where: { id: order.id } })).password, null);
    await m.service.saveCourse({ title: "Paused", url: "https://www.coursera.org/learn/test", isActive: false }, courseId);
    assert.equal((await m.service.courses({ ...page, q: "Paused" })).meta.total, 0);
    assert.equal((await m.service.courses({ ...page, q: "Paused" }, true)).meta.total, 1);
    await assert.rejects(m.service.createOrder(userId, input()), hasStatus(409));
  });

  it("searches by title or code, allows courses without a URL and snapshots an empty URL", async () => {
    const course = await m.service.saveCourse({ title: "Imported FUO course", code: "FUO-CSE101", url: null, isActive: true });
    await m.service.saveCourse({ title: "Second import", code: "FUO-CSE102", url: "", isActive: true }); // many NULL urls under the unique index
    assert.equal(course.code, "FUO-CSE101");
    assert.equal(course.url, null);
    assert.equal((await m.service.courses({ ...page, q: "fuo-cse101" })).items[0]?.id, course.id);
    assert.equal((await m.service.courses({ ...page, q: "imported fuo" })).items[0]?.id, course.id);
    assert.equal((await m.service.courses({ ...page, q: "FUO-CSE" })).meta.total, 2);
    await assert.rejects(m.service.saveCourse({ title: "Clash", code: "FUO-CSE101", isActive: true }), hasStatus(409));
    const order = await m.service.createOrder(userId, { ...input(), courseId: course.id });
    assert.equal(order.courseUrl, "");
  });

  it("reveals plaintext passwords as stored and decrypts legacy v1 rows", async () => {
    const free = (await m.service.saveCourse({ title: "Credential course", isActive: true })).id;
    const plain = await m.service.createOrder(userId, { ...input(), courseId: free, password: "v1.looks-like-an-envelope" });
    assert.equal((await m.service.credentials(plain.id, otherId)).password, "v1.looks-like-an-envelope");
    const legacy = await m.service.createOrder(userId, { ...input(), courseId: free });
    await m.prisma.courseraOrder.update({ where: { id: legacy.id }, data: { password: m.legacy("old secret") } });
    assert.equal((await m.service.credentials(legacy.id, otherId)).password, "old secret");
  });

  it("mails status changes with the refund and balance after", async () => {
    const course = await m.service.saveCourse({ title: "Mail course", url: "https://www.coursera.org/learn/mail-test", price: 40, isActive: true });
    const buyer = await m.prisma.user.create({ data: { email: "mail@example.invalid", fullName: "Mail", password: "test", balance: 100 } });
    const order = await m.service.createOrder(buyer.id, { ...input(), courseId: course.id, expectedPrice: 40 });
    await m.service.updateStatus(order.id, { expectedStatus: "PENDING", status: "PROCESSING", adminNote: "" });
    await m.service.updateStatus(order.id, { expectedStatus: "PROCESSING", status: "REJECTED", adminNote: "Sai tài khoản" });
    await settle();
    const mine = mails.filter((x) => x.to === buyer.email);
    assert.deepEqual(mine.map((x) => [x.event, x.amount, x.balanceAfter]), [["received", 40, 60], ["PROCESSING", 0, 100 - 40], ["REJECTED", 40, 100]]);
    assert.match(mine[2]!.text, /Sai tài khoản/);
  });
});
