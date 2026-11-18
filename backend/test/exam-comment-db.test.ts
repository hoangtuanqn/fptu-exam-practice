import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Bình luận câu hỏi trên MySQL thật (TEST_DB=1): ai thấy gì, gửi trùng, câu không có, xoá của mình, duyệt/từ chối, đếm theo câu.

const loadModules = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  svc: (await import("../src/services/exam-comment.service")).examCommentService,
  perDay: (await import("../src/constants/exam-comment")).EXAM_COMMENT_PER_DAY,
});

const page = { page: 1, limit: 20 };
const status = (code: number) => (err: unknown) => (err as { status?: number }).status === code;
const member = (userId: string) => ({ owner: { userId }, isAdmin: false });

describe("exam comments (MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof loadModules>>;
  let me: string, other: string, admin: string, exam: string, notMine: string;

  before(async () => {
    db = await createThrowawayDb();
    m = await loadModules();
    const user = async (key: string) => (await m.prisma.user.create({ data: { email: `${key}@test.local`, fullName: key, password: "x" } })).id;
    const mkExam = async (threadId: string) => {
      const e = await m.prisma.exam.create({ data: { threadId, title: `TST101 ${threadId}`, sourceUrl: "https://example.invalid", totalQuestions: 2, answerSource: "AI" } });
      await m.prisma.examQuestion.createMany({ data: [1, 2].map((n) => ({ examId: e.id, number: n, name: `q${n}`, imagePath: `x/${n}.png`, sourceImage: "s" })) });
      return e.id;
    };
    me = await user("me");
    other = await user("other");
    admin = await user("admin");
    exam = await mkExam("t1");
    notMine = await mkExam("t2");
    await m.prisma.userExam.createMany({ data: [{ userId: me, examId: exam }, { userId: other, examId: exam }] });
  });

  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
  });

  it("rejects an exam outside the library (404) and a question not in the exam (422)", async () => {
    await assert.rejects(m.svc.create(member(me), me, notMine, { questionNumber: 1, body: "x" }), status(404));
    await assert.rejects(m.svc.list(member(me), me, notMine, { question: 1, ...page }), status(404));
    await assert.rejects(m.svc.create(member(me), me, exam, { questionNumber: 9, body: "x" }), status(422));
    assert.equal(await m.prisma.examComment.count(), 0);
  });

  it("a new comment is PENDING, visible only to its author until approved", async () => {
    const c = await m.svc.create(member(me), me, exam, { questionNumber: 1, body: "Đáp án B" });
    assert.equal(c.status, "PENDING");
    assert.equal(c.mine, true);
    await assert.rejects(m.svc.create(member(me), me, exam, { questionNumber: 1, body: "đáp án  b" }), status(409)); // trùng
    await m.svc.create(member(me), me, exam, { questionNumber: 2, body: "Đáp án B" }); // câu khác: được

    const mine = await m.svc.list(member(me), me, exam, { question: 1, ...page });
    assert.deepEqual(mine.items.map((i) => [i.id, i.status, i.mine]), [[c.id, "PENDING", true]]);
    assert.equal(mine.meta.total, 0); // chưa duyệt không tính vào tổng
    assert.equal((await m.svc.list(member(other), other, exam, { question: 1, ...page })).items.length, 0);
    assert.equal((await m.svc.list({ owner: { guestId: "g" }, isAdmin: true }, null, exam, { question: 1, ...page })).items.length, 0);
    assert.deepEqual(await m.svc.counts(member(other), exam), { counts: {} });

    const reviewed = await m.svc.review(admin, c.id, { status: "APPROVED" });
    assert.equal(reviewed.status, "APPROVED");
    assert.deepEqual(reviewed.author, { id: me, email: "me@test.local", fullName: "me" });
    assert.match(reviewed.imageUrl ?? "", /x\/1\.png$/);
    const seen = await m.svc.list(member(other), other, exam, { question: 1, ...page });
    assert.deepEqual(seen.items.map((i) => [i.id, i.mine, i.author.name]), [[c.id, false, "me"]]);
    assert.equal(JSON.stringify(seen).includes(me), false); // không lộ id người viết
    assert.deepEqual(await m.svc.counts(member(other), exam), { counts: { "1": 1 } });
  });

  it("review transitions are idempotent, rejected comments stay visible to the author only", async () => {
    const c = await m.svc.create(member(other), other, exam, { questionNumber: 2, body: "spam" });
    const first = await m.svc.review(admin, c.id, { status: "REJECTED", note: "spam" });
    const again = await m.svc.review(admin, c.id, { status: "REJECTED" });
    assert.equal(first.status, "REJECTED");
    assert.equal(first.reviewNote, "spam");
    assert.equal(again.status, "REJECTED");
    assert.equal((await m.prisma.examComment.findUnique({ where: { id: c.id } }))?.reviewedById, admin);
    assert.deepEqual((await m.svc.list(member(other), other, exam, { question: 2, ...page })).items.map((i) => i.status), ["REJECTED"]);
    assert.deepEqual((await m.svc.list(member(me), me, exam, { question: 2, ...page })).items.map((i) => i.mine), [true]); // chỉ bình luận chờ của tôi
    assert.equal((await m.svc.review(admin, c.id, { status: "APPROVED" })).status, "APPROVED"); // đổi ý được
    await assert.rejects(m.svc.review(admin, "0190f5a2-1c3b-7000-8000-000000000000", { status: "APPROVED" }), status(404));
  });

  it("admin list, summary and bulk review", async () => {
    assert.deepEqual(await m.svc.adminSummary(), { pending: 1 });
    const pending = await m.svc.adminList({ status: "PENDING", ...page });
    assert.equal(pending.items.length, 1);
    assert.equal(pending.items[0]!.exam.id, exam);
    assert.equal((await m.svc.adminList({ status: "all", q: "spam", ...page })).meta.total, 1);
    assert.equal((await m.svc.adminList({ status: "all", q: "other@test", ...page })).meta.total, 1);
    assert.deepEqual(await m.svc.bulkReview(admin, { ids: [pending.items[0]!.id, pending.items[0]!.id], status: "APPROVED" }), { updated: 1 });
    assert.deepEqual(await m.svc.adminSummary(), { pending: 0 });
  });

  it("only the author deletes their comment; admin deletes any", async () => {
    const c = await m.svc.create(member(me), me, exam, { questionNumber: 2, body: "xoá tôi" });
    await assert.rejects(m.svc.removeOwn(other, exam, c.id), status(404));
    await assert.rejects(m.svc.removeOwn(me, notMine, c.id), status(404));
    assert.deepEqual(await m.svc.removeOwn(me, exam, c.id), { id: c.id, deleted: true });
    await assert.rejects(m.svc.removeOwn(me, exam, c.id), status(404));
    const d = await m.svc.create(member(me), me, exam, { questionNumber: 2, body: "admin xoá" });
    assert.deepEqual(await m.svc.adminRemove(d.id), { id: d.id, deleted: true });
    await assert.rejects(m.svc.adminRemove(d.id), status(404));
  });

  it("blocks after the daily limit (429)", async () => {
    const already = await m.prisma.examComment.count({ where: { userId: other } });
    await m.prisma.examComment.createMany({
      data: Array.from({ length: m.perDay - already }, (_, i) => ({ examId: exam, questionNumber: 1, userId: other, body: `seed ${i}` })),
    });
    await assert.rejects(m.svc.create(member(other), other, exam, { questionNumber: 1, body: "one more" }), status(429));
  });
});
