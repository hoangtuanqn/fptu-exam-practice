import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Câu đã lưu trên MySQL thật (TEST_DB=1): chỉ lưu được câu thật của đề trong kho, lưu trùng không lỗi, danh sách theo người gọi, trần số câu.

const loadModules = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  saved: (await import("../src/services/saved-question.service")).savedQuestionService,
  max: (await import("../src/constants/saved-question")).SAVED_QUESTIONS_MAX,
});

const page = { page: 1, limit: 20 };
const status = (code: number) => (err: unknown) => (err as { status?: number }).status === code;

describe("saved questions (MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof loadModules>>;
  let me: number, other: number, aiExam: number, defaultExam: number, notMine: number;

  before(async () => {
    db = await createThrowawayDb();
    m = await loadModules();
    const user = async (key: string) => (await m.prisma.user.create({ data: { email: `${key}@test.local`, fullName: key, password: "x" } })).id;
    const exam = async (threadId: string, answerSource: string) => {
      const e = await m.prisma.exam.create({
        data: { threadId, title: `TST101 ${threadId}`, subjectCode: "TST101", sourceUrl: "https://example.invalid", totalQuestions: 3, answerSource },
      });
      await m.prisma.examQuestion.createMany({
        data: [1, 2, 3].map((n) => ({ examId: e.id, number: n, name: `q${n}`, imagePath: `x/${n}.png`, sourceImage: "s", answer: "A C", isReference: n === 3 })),
      });
      return e.id;
    };
    me = await user("me");
    other = await user("other");
    aiExam = await exam("t1", "AI");
    defaultExam = await exam("t2", "DEFAULT");
    notMine = await exam("t3", "AI");
    await m.prisma.userExam.createMany({ data: [{ userId: me, examId: aiExam }, { userId: me, examId: defaultExam }, { userId: other, examId: aiExam }] });
  });

  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
  });

  it("saves idempotently and deletes", async () => {
    assert.equal(m.max, 500);
    assert.deepEqual(await m.saved.save(me, aiExam, 1), { saved: true });
    assert.deepEqual(await m.saved.save(me, aiExam, 1), { saved: true });
    assert.equal(await m.prisma.savedQuestion.count({ where: { userId: me } }), 1);
    assert.deepEqual(await m.saved.numbersOfExam(me, aiExam), [1]);
    assert.deepEqual(await m.saved.remove(me, aiExam, 1), { saved: false });
    assert.deepEqual(await m.saved.remove(me, aiExam, 1), { saved: false }); // xoá dòng không có: không lỗi
    assert.deepEqual(await m.saved.numbersOfExam(me, aiExam), []);
  });

  it("rejects an exam not in the library and a question that does not exist", async () => {
    await assert.rejects(m.saved.save(me, notMine, 1), status(404));
    await assert.rejects(m.saved.save(me, 999_999, 1), status(404));
    await assert.rejects(m.saved.save(me, aiExam, 99), status(404));
    await assert.rejects(m.saved.save(me, aiExam, 3), status(404)); // ảnh tài liệu tham khảo không phải câu hỏi
    assert.equal(await m.prisma.savedQuestion.count(), 0);
  });

  it("lists only the caller's rows, newest first, and hides placeholder answers", async () => {
    await m.saved.save(me, aiExam, 2);
    await m.saved.save(me, defaultExam, 1);
    await m.saved.save(other, aiExam, 1);
    const { items, meta } = await m.saved.list(me, page);
    assert.equal(meta.total, 2);
    assert.deepEqual(items.map((i) => [i.examId, i.number]), [[defaultExam, 1], [aiExam, 2]]);
    assert.deepEqual(items[0]!.correct, []); // đề DEFAULT: không có "A" giả
    assert.deepEqual(items[1]!.correct, ["A", "C"]);
    assert.equal(items[1]!.subjectCode, "TST101");
    assert.equal((await m.saved.list(me, { ...page, subject: "OTH101" })).meta.total, 0);
    assert.equal((await m.saved.list(other, page)).meta.total, 1);
    await m.saved.remove(other, defaultExam, 1); // người khác không xoá được câu của tôi
    assert.equal((await m.saved.list(me, page)).meta.total, 2);
  });

  it("returns 409 at the ceiling but still accepts re-saving an existing row", async () => {
    await assert.rejects(m.saved.save(me, aiExam, 1, 2), status(409));
    assert.deepEqual(await m.saved.save(me, aiExam, 2, 2), { saved: true });
  });
});
