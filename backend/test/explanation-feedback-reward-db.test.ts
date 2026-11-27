import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Admin xác nhận một 👎 đúng: thưởng credit, xóa lời giải bị chê, đóng các 👎 khác của câu (TEST_DB=1, MySQL dùng một lần).

const load = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  feedback: (await import("../src/services/explanation-feedback.service")).explanationFeedbackService,
  confirmFeedbackBody: (await import("../src/rules/requests/explanation.request")).confirmFeedbackBody,
});
const hasStatus = (status: number) => (error: unknown) => (error as { status?: number }).status === status;
const QUESTIONS = 10;

describe("explanation feedback reward (throwaway MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof load>>;
  let admin: string, member: string, other: string, examId: string;

  const submit = (userId: string, questionNumber: number, helpful: boolean) =>
    m.feedback.submit({ owner: { userId }, isAdmin: true }, userId, { examId, questionNumber, helpful, reason: helpful ? undefined : "WRONG", comment: helpful ? undefined : "sai buoc 2" });
  // Gửi 👎 rồi trả id góp ý
  const open = async (userId: string, questionNumber: number) => {
    await submit(userId, questionNumber, false);
    return (await m.prisma.explanationFeedback.findFirstOrThrow({ where: { userId, examId, questionNumber } })).id;
  };
  const balance = async (userId: string) => (await m.prisma.user.findUniqueOrThrow({ where: { id: userId } })).balance;
  const explanationOf = (questionNumber: number) => m.prisma.questionExplanation.findFirst({ where: { examId, questionNumber } });
  const regenerate = async (questionNumber: number) => {
    await new Promise((r) => setTimeout(r, 5));
    await m.prisma.questionExplanation.deleteMany({ where: { examId, questionNumber } });
    await m.prisma.questionExplanation.create({ data: { examId, questionNumber, content: `giai lai ${questionNumber}`, model: "test" } });
  };

  before(async () => {
    db = await createThrowawayDb();
    m = await load();
    const user = async (key: string) => (await m.prisma.user.create({ data: { email: `${key}@example.invalid`, fullName: key, password: "x" } })).id;
    admin = await user("admin");
    member = await user("member");
    other = await user("other");
    const numbers = Array.from({ length: QUESTIONS }, (_, i) => i + 1);
    examId = (await m.prisma.exam.create({ data: { threadId: "fb1", title: "TST102 fb1", sourceUrl: "https://example.invalid", totalQuestions: QUESTIONS, answerSource: "AI" } })).id;
    await m.prisma.examQuestion.createMany({ data: numbers.map((n) => ({ examId, number: n, name: `q${n}`, imagePath: `x/${n}.png`, sourceImage: "s", answer: "A" })) });
    await m.prisma.questionExplanation.createMany({ data: numbers.map((n) => ({ examId, questionNumber: n, content: `giai ${n}`, model: "test" })) });
    for (const userId of [member, other]) await m.prisma.explanationUnlock.create({ data: { userId, examId, price: 0, questions: QUESTIONS } });
    await new Promise((r) => setTimeout(r, 5)); // góp ý tạo sau lời giải
  });
  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
  });

  it("validates the confirm body", () => {
    assert.equal(m.confirmFeedbackBody.safeParse({ answer: "Z9" }).success, false);
    assert.equal(m.confirmFeedbackBody.safeParse({ extra: 1 }).success, false);
    assert.equal(m.confirmFeedbackBody.safeParse({}).success, true);
    assert.equal(m.confirmFeedbackBody.parse({ answer: "ca" }).answer, "CA");
  });

  it("rewards once, deletes the explanation, closes sibling dislikes", async () => {
    const start = await balance(member);
    const a = await open(member, 1),
      b = await open(other, 1);
    const row = await m.feedback.confirm(admin, a, {});
    assert.equal(row.reward, 50);
    assert.equal(row.explanation, null);
    assert.equal(row.currentAnswer, "A");
    assert.equal(row.explanationStale, false);
    assert.equal(typeof row.resolvedAt, "string");
    assert.equal(await balance(member), start + 50);
    const sibling = await m.prisma.explanationFeedback.findUniqueOrThrow({ where: { id: b } });
    assert.ok(sibling.resolvedAt);
    assert.equal(sibling.reward, 0);
    await assert.rejects(m.feedback.confirm(admin, a, {}), hasStatus(409));
    await assert.rejects(m.feedback.confirm(admin, b, {}), hasStatus(409));
    assert.equal(await balance(member), start + 50);
    assert.equal(await m.prisma.walletTransaction.count({ where: { userId: member, type: "REPORT_REWARD", note: "Góp ý lời giải đúng: TST102 fb1, câu 1" } }), 1);
  });

  it("pays the report reward when the answer is corrected", async () => {
    const start = await balance(member);
    const row = await m.feedback.confirm(admin, await open(member, 2), { answer: "CA" });
    assert.equal(row.reward, 200);
    assert.equal(row.currentAnswer, "A C");
    assert.equal(await balance(member), start + 200);
    assert.equal(await explanationOf(2), null);
  });

  it("lets exactly one of two concurrent confirms win", async () => {
    const ids = [await open(member, 3), await open(other, 3)];
    const done = await Promise.allSettled(ids.map((id) => m.feedback.confirm(admin, id, {})));
    assert.equal(done.filter((r) => r.status === "fulfilled").length, 1);
    const failed = done.find((r) => r.status === "rejected") as PromiseRejectedResult;
    assert.equal((failed.reason as { status?: number }).status, 409);
    assert.equal(await m.prisma.walletTransaction.count({ where: { note: { contains: "câu 3" } } }), 1);
    assert.equal(await m.prisma.explanationFeedback.count({ where: { examId, questionNumber: 3, reward: { gt: 0 } } }), 1);
  });

  it("refuses a regenerated explanation and leaves everything as it was", async () => {
    const start = await balance(member);
    const id = await open(member, 4);
    await regenerate(4);
    const listed = (await m.feedback.adminList({ page: 1, limit: 50, helpful: "down", resolved: "false" })).items.find((r) => r.id === id);
    assert.equal(listed?.explanationStale, true);
    await assert.rejects(m.feedback.confirm(admin, id, {}), hasStatus(409));
    assert.equal((await m.prisma.explanationFeedback.findUniqueOrThrow({ where: { id } })).resolvedAt, null);
    assert.equal((await explanationOf(4))?.content, "giai lai 4");
    assert.equal(await balance(member), start);
  });

  it("refuses while the member has a pending answer report for the question", async () => {
    const id = await open(member, 5);
    await m.prisma.answerReport.create({ data: { examId, questionNumber: 5, userId: member, currentAnswer: "A", proposedAnswer: "B", reason: "ly do du dai" } });
    await assert.rejects(m.feedback.confirm(admin, id, {}), hasStatus(409));
    assert.equal((await explanationOf(5))?.content, "giai 5");
    assert.equal((await m.prisma.explanationFeedback.findUniqueOrThrow({ where: { id } })).resolvedAt, null);
  });

  it("refuses a corrected answer equal to the current one", async () => {
    const start = await balance(member);
    const id = await open(member, 6);
    await assert.rejects(m.feedback.confirm(admin, id, { answer: "a" }), hasStatus(400));
    assert.equal((await m.prisma.explanationFeedback.findUniqueOrThrow({ where: { id } })).resolvedAt, null);
    assert.equal((await explanationOf(6))?.content, "giai 6");
    assert.equal(await balance(member), start);
  });

  it("404s an unknown id and 409s a like", async () => {
    await assert.rejects(m.feedback.confirm(admin, "00000000-0000-7000-8000-000000000000", {}), hasStatus(404));
    await submit(member, 8, true);
    const like = await m.prisma.explanationFeedback.findFirstOrThrow({ where: { userId: member, examId, questionNumber: 8 } });
    await assert.rejects(m.feedback.confirm(admin, like.id, {}), hasStatus(409));
    assert.equal((await explanationOf(8))?.content, "giai 8");
  });

  it("asks again about a regenerated explanation and reopens the complaint", async () => {
    const id = await open(member, 7);
    await m.feedback.confirm(admin, id, {});
    await regenerate(7);
    assert.equal(await m.feedback.mine(member, examId, 7), null);
    await open(member, 7); // cùng lý do, cùng nội dung
    const row = await m.prisma.explanationFeedback.findUniqueOrThrow({ where: { id } });
    assert.equal(row.resolvedAt, null);
    assert.equal(row.reward, 0);
    assert.equal(await m.feedback.mine(member, examId, 7), false);
  });
});
