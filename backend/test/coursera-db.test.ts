import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

const load = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  service: (await import("../src/services/coursera.service")).courseraService,
  notices: (await import("../src/services/admin-notice.service")).adminNoticeService,
  mail: (await import("../src/services/mail.service")).mailService,
});
type Push = { kind: string; title: string; body?: string | null; userId?: number | null };
type Mail = { to: string; event: string; amount: number; balanceAfter: number | null; text: string; html: string };
const page = { page: 1, limit: 20 };
const hasStatus = (status: number) => (error: unknown) => (error as { status?: number }).status === status;

describe("Coursera orders (throwaway MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof load>>;
  let userId: number, otherId: number, courseId: string;
  const pushes: Push[] = [];
  const mails: Mail[] = [];
  const settle = () => new Promise((resolve) => setTimeout(resolve, 50)); // mails resolve the user before sending
  before(async () => {
    db = await createThrowawayDb(); m = await load();
    m.notices.push = (kind, input) => { pushes.push({ kind, ...input }); };
    m.mail.sendCourseraOrder = async (to, input) => {
      const { renderCourseraOrderEmail } = await import("../src/mail/templates/coursera-notice");
      const { text, html } = renderCourseraOrderEmail(input);
      mails.push({ to, event: input.event, amount: input.amount, balanceAfter: input.balanceAfter, text, html });
    };
    userId = (await m.prisma.user.create({ data: { email: "coursera@example.invalid", fullName: "Test", password: "test" } })).id;
    otherId = (await m.prisma.user.create({ data: { email: "other@example.invalid", fullName: "Other", password: "test" } })).id;
    courseId = (await m.service.saveCourse({ title: "Original course", url: "https://www.coursera.org/learn/test", isActive: true })).id;
  });
  after(async () => {
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

  it("reveals passwords exactly as stored", async () => {
    const free = (await m.service.saveCourse({ title: "Credential course", isActive: true })).id;
    const plain = await m.service.createOrder(userId, { ...input(), courseId: free, password: "v1.looks-like-an-envelope" });
    assert.equal((await m.service.credentials(plain.id, otherId)).password, "v1.looks-like-an-envelope");
  });

  it("looks up a pasted link once as an unlisted course, hides it from members and charges the link price", async () => {
    let calls = 0;
    const fetcher = (async () => { calls++; return new Response(JSON.stringify({ elements: [{ name: "Linked Course", slug: "linked-course" }] }), { status: 200 }); }) as typeof fetch;
    const [first, raced] = await Promise.all([
      m.service.lookup("https://coursera.org/vi/learn/linked-course/?x=1", fetcher),
      m.service.lookup("https://www.coursera.org/learn/linked-course", fetcher),
    ]);
    assert.equal(first.id, raced.id);
    assert.deepEqual({ url: first.url, title: first.title, kind: first.kind, price: first.price, listed: first.listed, code: first.code, isActive: first.isActive },
      { url: "https://www.coursera.org/learn/linked-course", title: "Linked Course", kind: "course", price: 50000, listed: false, code: null, isActive: true });
    const before = calls;
    assert.equal((await m.service.lookup("https://www.coursera.org/learn/linked-course", fetcher)).id, first.id);
    assert.equal(calls, before); // known rows are returned without calling Coursera
    assert.equal(await m.prisma.courseraCourse.count({ where: { url: first.url } }), 1);
    assert.equal((await m.service.courses({ ...page, q: "Linked Course" })).meta.total, 0);
    assert.equal((await m.service.courses({ ...page, q: "Linked Course" }, true)).items[0]?.listed, false);

    // Existing catalog rows keep their own price; admins can list a link course.
    const catalog = await m.service.saveCourse({ title: "Catalog", url: "https://www.coursera.org/learn/catalog-course", price: 70, isActive: true });
    const known = await m.service.lookup("https://www.coursera.org/learn/catalog-course", fetcher);
    assert.deepEqual([known.id, known.price, known.listed], [catalog.id, 70, true]);
    await m.service.saveCourse({ title: first.title, url: first.url, isActive: true, listed: true }, first.id);
    assert.equal((await m.service.courses({ ...page, q: "Linked Course" })).meta.total, 1);
    await m.service.saveCourse({ title: "Renamed link", url: first.url, isActive: true }, first.id); // omitted listed stays true
    assert.equal((await m.prisma.courseraCourse.findUniqueOrThrow({ where: { id: first.id } })).listed, true);

    const buyer = await m.prisma.user.create({ data: { email: "link@example.invalid", fullName: "Link", password: "test", balance: 60000 } });
    const order = await m.service.createOrder(buyer.id, { ...input(), courseId: first.id, expectedPrice: first.price });
    assert.equal(order.amount, 50000);
    assert.equal((await m.prisma.user.findUniqueOrThrow({ where: { id: buyer.id } })).balance, 10000);
  });

  it("maps invalid links, unknown courses and Coursera failures without creating rows", async () => {
    const empty = (async () => new Response(JSON.stringify({ elements: [] }), { status: 200 })) as typeof fetch;
    const down = (async () => { throw new Error("upstream detail"); }) as typeof fetch;
    const count = () => m.prisma.courseraCourse.count();
    const start = await count();
    await assert.rejects(m.service.lookup("https://evil.invalid/learn/x", empty), (e: unknown) => hasStatus(400)(e) && /coursera\.org\/learn/.test((e as Error).message));
    await assert.rejects(m.service.lookup("https://www.coursera.org/learn/missing-course", empty), (e: unknown) => hasStatus(404)(e) && (e as Error).message === "Không tìm thấy khóa học này trên Coursera");
    await assert.rejects(m.service.lookup("https://www.coursera.org/specializations/down-course", down), (e: unknown) => hasStatus(503)(e) && !(e as Error).message.includes("upstream"));
    assert.equal(await count(), start);
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

  it("saves a standalone admin note in any status and mails only when it changes", async () => {
    const course = await m.service.saveCourse({ title: "Note course", url: "https://www.coursera.org/learn/note-test", price: 20, isActive: true });
    const buyer = await m.prisma.user.create({ data: { email: "note@example.invalid", fullName: "Note", password: "test", balance: 100 } });
    const body = { ...input(), courseId: course.id, expectedPrice: 20, password: "note secret" };
    const order = await m.service.createOrder(buyer.id, body);
    const noteMails = () => mails.filter((x) => x.to === buyer.email && x.event === "note");

    const pending = await m.service.updateNote(order.id, { adminNote: "<b>Kiểm tra</b> & đợi" });
    assert.deepEqual([pending.status, pending.adminNote, pending.amount, "password" in pending], ["PENDING", "<b>Kiểm tra</b> & đợi", 20, false]);
    assert.equal((await m.prisma.courseraOrder.findUniqueOrThrow({ where: { id: order.id } })).password, body.password); // credentials untouched
    await m.service.updateNote(order.id, { adminNote: "<b>Kiểm tra</b> & đợi" }); // unchanged: no second mail
    await settle();
    assert.equal(noteMails().length, 1);
    const mail = noteMails()[0]!;
    assert.ok(mail.html.includes("&lt;b&gt;Kiểm tra&lt;/b&gt; &amp; đợi") && !mail.html.includes("<b>Kiểm tra</b>"));
    assert.match(mail.text, /Ghi chú: <b>Kiểm tra<\/b> & đợi/);
    assert.match(mail.text, /\/account\/coursera/);
    for (const value of [mail.text, mail.html]) assert.ok(!value.includes(body.password) && !value.includes("Phí đơn") && !value.includes("Số dư"));

    await m.service.cancel(order.id, buyer.id);
    const before = await m.prisma.courseraOrder.findUniqueOrThrow({ where: { id: order.id } });
    const terminal = await m.service.updateNote(order.id, { adminNote: "Đã hoàn phí" });
    const after = await m.prisma.courseraOrder.findUniqueOrThrow({ where: { id: order.id } });
    assert.deepEqual([terminal.status, after.adminNote, after.amount, after.refundedAt?.getTime(), after.password], ["CANCELLED", "Đã hoàn phí", before.amount, before.refundedAt?.getTime(), null]);
    assert.equal((await m.prisma.user.findUniqueOrThrow({ where: { id: buyer.id } })).balance, 100);
    await settle();
    assert.equal(noteMails().length, 2);
    await assert.rejects(m.service.updateNote("00000000-0000-7000-8000-000000000000", { adminNote: "x" }), hasStatus(404));
  });
});
