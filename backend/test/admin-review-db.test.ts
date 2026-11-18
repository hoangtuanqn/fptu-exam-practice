import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Badge và nút "Giải quyết" của admin cho báo cáo đáp án và đánh giá lời giải AI (TEST_DB=1, MySQL dùng một lần).

const load = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  reports: (await import("../src/services/answer-report.service")).answerReportService,
  feedback: (await import("../src/services/explanation-feedback.service")).explanationFeedbackService,
  notifications: (await import("../src/services/notification.service")).notificationService,
  listReportsQuery: (await import("../src/rules/requests/answer-report.request")).listReportsQuery,
  listFeedbackQuery: (await import("../src/rules/requests/explanation.request")).listFeedbackQuery,
});
const hasStatus = (status: number) => (error: unknown) => (error as { status?: number }).status === status;

describe("admin review badges (throwaway MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof load>>;
  let admin: number, member: number, examId: string;
  const counts = async () => ({ reports: await m.reports.countPending(), feedback: await m.feedback.countPending() });
  const actor = () => ({ owner: { userId: member }, isAdmin: true });

  before(async () => {
    db = await createThrowawayDb();
    m = await load();
    m.notifications.reportApproved = () => undefined; // không gửi mail trong test
    const user = async (key: string) => (await m.prisma.user.create({ data: { email: `${key}@example.invalid`, fullName: key, password: "x" } })).id;
    admin = await user("admin");
    member = await user("member");
    examId = (await m.prisma.exam.create({ data: { threadId: "r1", title: "TST101 r1", sourceUrl: "https://example.invalid", totalQuestions: 3, answerSource: "AI" } })).id;
    await m.prisma.examQuestion.createMany({ data: [1, 2, 3].map((n) => ({ examId, number: n, name: `q${n}`, imagePath: `x/${n}.png`, sourceImage: "s", answer: "A" })) });
    await m.prisma.questionExplanation.createMany({ data: [1, 3].map((n) => ({ examId, questionNumber: n, content: `giai ${n}`, model: "test" })) });
    await m.prisma.explanationUnlock.create({ data: { userId: member, examId, price: 0, questions: 3 } });
  });
  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
  });

  it("parses the resolved filter and keeps old params working", () => {
    assert.equal(m.listReportsQuery.parse({}).resolved, undefined);
    assert.equal(m.listReportsQuery.parse({ status: "PENDING", resolved: "" }).resolved, "");
    assert.equal(m.listFeedbackQuery.parse({ helpful: "down", resolved: "true" }).resolved, "true");
    assert.equal(m.listFeedbackQuery.safeParse({ resolved: "yes" }).success, false);
  });

  it("counts, resolves idempotently, filters, 404s and drops approved/rejected reports", async () => {
    const mk = (questionNumber: number) =>
      m.prisma.answerReport.create({ data: { examId, questionNumber, userId: member, currentAnswer: "A", proposedAnswer: "B", reason: "ly do du dai" } });
    const [r1, r2, r3] = [await mk(1), await mk(2), await mk(3)];
    assert.equal((await counts()).reports, 3);

    const first = await m.reports.resolve(admin, r1.id);
    assert.ok(first.resolvedAt);
    assert.equal(first.resolvedById, admin);
    assert.equal(first.imageUrl !== undefined, true);
    const again = await m.reports.resolve(admin + 999, r1.id);
    assert.equal(again.resolvedAt!.getTime(), first.resolvedAt!.getTime());
    assert.equal(again.resolvedById, admin);
    assert.equal((await counts()).reports, 2);
    await assert.rejects(m.reports.resolve(admin, "00000000-0000-7000-8000-000000000000"), hasStatus(404));

    const page = { page: 1, limit: 20 };
    assert.deepEqual((await m.reports.list({ ...page, resolved: "true" })).items.map((r) => r.id), [r1.id]);
    assert.deepEqual((await m.reports.list({ ...page, status: "PENDING", resolved: "false" })).items.map((r) => r.id), [r3.id, r2.id]);
    assert.equal((await m.reports.list({ ...page, resolved: "" })).meta.total, 3);

    await m.reports.approve(admin, r2.id, {});
    await m.reports.reject(admin, r3.id, {});
    assert.equal((await counts()).reports, 0);
    const done = await m.reports.resolve(admin, r3.id); // đã từ chối: trả về nguyên trạng
    assert.equal(done.status, "REJECTED");
    assert.equal(done.resolvedAt, null);
  });

  it("resolves feedback idempotently and re-opens it on a new complaint", async () => {
    const submit = (questionNumber: number, helpful: boolean, comment?: string) =>
      m.feedback.submit(actor(), member, { examId, questionNumber, helpful, reason: helpful ? undefined : "WRONG", comment });
    await submit(1, false, "sai");
    await submit(3, true); // câu 2 mất lời giải khi báo cáo được duyệt ở test trên
    assert.equal((await counts()).feedback, 1);
    const id = (await m.prisma.explanationFeedback.findFirstOrThrow({ where: { questionNumber: 1 } })).id;

    const first = await m.feedback.adminResolve(admin, id);
    assert.equal(typeof first.resolvedAt, "string");
    assert.equal(first.explanation, "giai 1");
    assert.equal((await m.feedback.adminResolve(admin + 999, id)).resolvedAt, first.resolvedAt);
    assert.equal((await counts()).feedback, 0);
    await assert.rejects(m.feedback.adminResolve(admin, "00000000-0000-7000-8000-000000000000"), hasStatus(404));

    const page = { page: 1, limit: 20 };
    assert.deepEqual((await m.feedback.adminList({ ...page, resolved: "true" })).items.map((r) => r.id), [id]);
    assert.equal((await m.feedback.adminList({ ...page, helpful: "down", resolved: "false" })).meta.total, 0);

    await submit(1, false, "sai"); // gửi lại y hệt: vẫn đã giải quyết
    assert.equal((await counts()).feedback, 0);
    await submit(1, false, "van sai, xem lai buoc 2"); // góp ý mới: mở lại
    assert.equal((await counts()).feedback, 1);
    assert.equal((await m.prisma.explanationFeedback.findUniqueOrThrow({ where: { id } })).resolvedById, null);

    await m.feedback.adminResolve(admin, id);
    await submit(1, true);
    await submit(1, false, "van sai, xem lai buoc 2"); // đổi từ hữu ích sang chê lại: mở lại
    assert.equal((await counts()).feedback, 1);
  });
});
