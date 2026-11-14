import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Đề chỉ có tệp đính kèm trên MySQL thật (TEST_DB=1): coi là xong khi đã có tệp, thay danh sách không trùng,
// chi tiết đề trả attachments, tệp của đề khác 404, không tạo lượt làm/nộp bài cho đề 0 câu.

const loadModules = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  exams: (await import("../src/repositories/exam.repository")).examRepository,
  attachments: (await import("../src/repositories/exam-attachment.repository")).examAttachmentRepository,
  examService: (await import("../src/services/exam.service")).examService,
  sessions: (await import("../src/services/practice-session.service")).practiceSessionService,
  attempts: (await import("../src/services/attempt.service")).attemptService,
});

const status = (code: number) => (err: unknown) => (err as { status?: number }).status === code;
const row = (name: string) => ({ name, filePath: `exams/9001/files/${name}`, mime: "application/pdf", sizeBytes: 10, sourceUrl: "https://example.invalid/a" });

describe("exam attachments (MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof loadModules>>;
  let examId: number, otherId: number, userId: number;

  before(async () => {
    db = await createThrowawayDb();
    m = await loadModules();
    userId = (await m.prisma.user.create({ data: { email: "a@test.local", fullName: "a", password: "x" } })).id;
    const shell = (threadId: string) => m.exams.createShell({ threadId, title: `TST101 ${threadId}`, sourceUrl: "https://example.invalid", totalQuestions: 0, answerSource: "MANUAL" });
    examId = (await shell("9001")).id;
    otherId = (await shell("9002")).id;
    await m.prisma.userExam.create({ data: { userId, examId } });
  });

  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
  });

  it("a 0-question exam is complete only once its files are saved, and replace never duplicates", async () => {
    const exam = { id: examId, totalQuestions: 0 };
    assert.equal(await m.exams.isComplete(exam), false);
    await m.attachments.replace(examId, [row("paper.pdf"), row("b.pdf")]);
    await m.attachments.replace(examId, [row("paper.pdf")]);
    assert.equal(await m.exams.isComplete(exam), true);
    assert.equal(await m.prisma.examAttachment.count({ where: { examId } }), 1);
  });

  it("detail returns attachments; a file of another exam is 404", async () => {
    const detail = await m.examService.getDetail({ owner: { userId }, isAdmin: false }, examId);
    assert.deepEqual(detail.questions, []);
    const [a] = detail.attachments;
    assert.ok(a);
    assert.deepEqual({ ...a, url: a.url.replace(/^.*\/api\/v1/, "") }, { id: a.id, name: "paper.pdf", mime: "application/pdf", sizeBytes: 10, kind: "pdf", url: `/exams/${examId}/attachments/${a.id}` });
    assert.equal((await m.examService.getAttachmentFile(examId, a.id)).name, "paper.pdf");
    await assert.rejects(m.examService.getAttachmentFile(otherId, a.id), status(404));
    const list = await m.examService.listMine({ userId }, { page: 1, limit: 20 });
    assert.equal(list.items[0]?.attachments, 1);
  });

  it("refuses practice sessions and attempts with 400", async () => {
    const actor = { owner: { userId }, isAdmin: false };
    await assert.rejects(m.sessions.create(actor, examId, { mode: "practice" } as never), status(400));
    await assert.rejects(m.attempts.submit(actor, examId, { mode: "practice", answers: {}, durationSec: 1 } as never), status(400));
  });
});
