import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import sharp from "sharp";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Admin tải đề bằng tay + danh sách đề còn thiếu (TEST_DB=1, MySQL dùng một lần). Ảnh ghi vào thư mục tạm, không đụng storage thật.
const STORAGE = fs.mkdtempSync(path.join(os.tmpdir(), "fepass-upload-"));
process.env.STORAGE_DIR = STORAGE;

const load = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  service: (await import("../src/services/admin.exam-upload.service")).adminExamUploadService,
});
const hasStatus = (status: number) => (error: unknown) => (error as { status?: number }).status === status;
const files = (buf: Buffer, ...n: number[]) => n.map((x) => ({ buffer: buf, originalname: `Q${x}.webp` }));
const body = (extra: Record<string, string | undefined> = {}) => ({ title: "TST101 manual", subjectCode: "TST101", kind: undefined, threadId: undefined, answers: undefined, ...extra }) as never;

describe("admin exam upload + gaps (throwaway MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof load>>;
  let admin: string;
  let webp: Buffer, big: Buffer, png: Buffer;

  before(async () => {
    db = await createThrowawayDb();
    m = await load();
    admin = (await m.prisma.user.create({ data: { email: "admin@example.invalid", fullName: "admin", password: "x", role: "ADMIN" } })).id;
    webp = await sharp({ create: { width: 40, height: 20, channels: 3, background: "#fff" } }).webp().toBuffer();
    big = await sharp({ create: { width: 3000, height: 600, channels: 3, background: "#000" } }).webp().toBuffer();
    png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).png().toBuffer();
    await m.prisma.fuoThread.createMany({
      data: [
        { threadId: "9001", subjectCode: "TST101", title: "TST101 FA25 FE", kind: "FE", postedAt: new Date("2026-01-02") },
        { threadId: "9002", subjectCode: "TST101", title: "TST101 PE", kind: "PE", postedAt: new Date("2026-01-03") },
        { threadId: "9003", subjectCode: "TST202", title: "TST202 quiz", kind: "QUIZ", postedAt: null },
      ],
    });
  });
  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
    fs.rmSync(STORAGE, { recursive: true, force: true });
  });

  let manualId = "";

  it("creates a manual exam: numbers from names, valid webp kept byte for byte, big one shrunk, answers from ans.json", async () => {
    const answers = JSON.stringify({ "Q1.webp": ["B"], "Q2.webp": ["c", "a"], "Q9.webp": ["A"] });
    const r = await m.service.create(admin, body({ answers }), [...files(webp, 2), ...files(big, 1), ...files(webp, 3)]);
    manualId = r.id;
    assert.match(r.threadId, /^m[0-9a-f]{12}$/);
    assert.deepEqual([r.created, r.totalQuestions, r.questions, r.answered, r.answerSource], [true, 3, 3, 2, "MANUAL"]);
    assert.deepEqual(r.ignoredAnswers, ["Q9.webp"]);
    const exam = await m.prisma.exam.findUniqueOrThrow({ where: { id: r.id }, include: { questions: { orderBy: { number: "asc" } } } });
    assert.deepEqual([exam.subjectCode, exam.kind, exam.sourceUrl, exam.createdById], ["TST101", "FE", "", admin]);
    assert.deepEqual(exam.questions.map((q) => [q.number, q.name, q.answer]), [[1, "Q1", "B"], [2, "Q2", "A C"], [3, "Q3", ""]]);
    const q2 = fs.readFileSync(path.join(STORAGE, exam.questions[1]!.imagePath));
    assert.ok(q2.equals(webp), "valid small webp is stored unchanged");
    const q1 = await sharp(fs.readFileSync(path.join(STORAGE, exam.questions[0]!.imagePath))).metadata();
    assert.deepEqual([q1.format, q1.width], ["webp", 2400]);
  });

  it("rejects bad input with 400 and leaves no files behind", async () => {
    const dirs = () => fs.readdirSync(path.join(STORAGE, "exams")).length;
    const before = dirs();
    await assert.rejects(m.service.create(admin, body(), files(webp, 1, 3)), hasStatus(400)); // thiếu Q2
    await assert.rejects(m.service.create(admin, body(), files(png, 1)), hasStatus(400)); // không phải webp
    await assert.rejects(m.service.create(admin, body({ answers: '{"Q1.webp":["Z"]}' }), files(webp, 1)), hasStatus(400));
    await assert.rejects(m.service.create(admin, body({ title: undefined }), files(webp, 1)), hasStatus(400));
    await assert.rejects(m.service.create(admin, body({ threadId: "123456" }), files(webp, 1)), hasStatus(404));
    // ảnh hỏng ở cuối: các ảnh đã ghi trước đó bị xoá
    const count = await m.prisma.exam.count();
    await assert.rejects(m.service.create(admin, body(), [...files(webp, 1), { buffer: Buffer.from("RIFF0000WEBPjunk"), originalname: "Q2.webp" }]), hasStatus(400));
    assert.equal(await m.prisma.exam.count(), count);
    const leftover = fs.readdirSync(path.join(STORAGE, "exams")).flatMap((d) => (fs.existsSync(path.join(STORAGE, "exams", d, "images")) ? fs.readdirSync(path.join(STORAGE, "exams", d, "images")) : []));
    assert.equal(leftover.length, 3); // chỉ ảnh của đề đã tạo ở test trước
    assert.ok(dirs() >= before);
  });

  it("updates images: replaces Q2 (drops its explanation, keeps its answer), appends Q4, rejects gaps", async () => {
    const before = await m.prisma.examQuestion.findUniqueOrThrow({ where: { examId_number: { examId: manualId, number: 2 } } });
    await m.prisma.questionExplanation.create({ data: { examId: manualId, questionNumber: 2, content: "old", model: "x" } });
    await assert.rejects(m.service.updateImages(admin, manualId, { answers: undefined }, files(webp, 6)), hasStatus(400));
    const r = await m.service.updateImages(admin, manualId, { answers: '{"Q4.webp":["D"]}' }, files(webp, 2, 4));
    assert.deepEqual([r.replaced, r.added, r.totalQuestions, r.questions, r.answered], [[2], [4], 4, 4, 3]);
    const after = await m.prisma.examQuestion.findUniqueOrThrow({ where: { examId_number: { examId: manualId, number: 2 } } });
    assert.notEqual(after.imagePath, before.imagePath);
    assert.equal(after.answer, "A C");
    assert.equal(fs.existsSync(path.join(STORAGE, before.imagePath)), false, "old image file removed");
    assert.equal(await m.prisma.questionExplanation.count({ where: { examId: manualId } }), 0);
  });

  it("attaches to a catalog thread; a complete exam answers 409, an incomplete shell is filled in place", async () => {
    const r = await m.service.create(admin, body({ threadId: "9001", title: undefined }), files(webp, 1, 2));
    assert.deepEqual([r.threadId, r.title, r.answerSource, r.answered], ["9001", "TST101 FA25 FE", "DEFAULT", 0]);
    const exam = await m.prisma.exam.findUniqueOrThrow({ where: { id: r.id } });
    assert.equal(exam.sourceUrl, "https://fuoverflow.com/threads/9001/");
    await assert.rejects(m.service.create(admin, body({ threadId: "9001" }), files(webp, 1)), (e: { status?: number; data?: { examId?: string } }) => e.status === 409 && e.data?.examId === r.id);

    const shell = await m.prisma.exam.create({ data: { threadId: "9002", title: "TST101 PE", sourceUrl: "https://fuoverflow.com/threads/9002/", totalQuestions: 5, answerSource: "PENDING", kind: "PE" } });
    await m.prisma.examQuestion.createMany({ data: [1, 2, 3].map((number) => ({ examId: shell.id, number, name: `old${number}`, imagePath: `exams/9002/images/old${number}.webp`, sourceImage: "x", answer: "" })) });
    const filled = await m.service.create(admin, body({ threadId: "9002", answers: '{"Q1.webp":["A"]}' }), files(webp, 1, 2));
    assert.deepEqual([filled.id, filled.created, filled.totalQuestions, filled.questions, filled.replaced, filled.answerSource], [shell.id, false, 2, 2, [1, 2], "MANUAL"]);
  });

  it("lists gaps with one query per page and a summary that matches", async () => {
    // 9003: chưa có đề. 9001: đủ ảnh, chưa có đáp án. Đề tải tay: đủ ảnh, đủ đáp án (Q3 trống -> vẫn thiếu đáp án)
    const all = await m.service.gaps({ gap: "all", page: 1, limit: 20 } as never);
    const byThread = new Map(all.items.map((i) => [i.threadId, i]));
    assert.equal(byThread.get("9003")?.gap, "no_exam");
    assert.equal(byThread.get("9003")?.sourceUrl, "https://fuoverflow.com/threads/9003/");
    assert.equal(byThread.get("9001")?.gap, "no_answers");
    const manual = [...byThread.values()].find((i) => i.examId === manualId);
    assert.deepEqual([manual?.gap, manual?.questions, manual?.answered, manual?.sourceUrl], ["no_answers", 4, 3, null]);
    assert.equal(all.meta.total, all.items.length);

    const onlyQuiz = await m.service.gaps({ gap: "all", kind: "QUIZ", page: 1, limit: 20 } as never);
    assert.deepEqual(onlyQuiz.items.map((i) => i.threadId), ["9003"]);
    const searched = await m.service.gaps({ gap: "no_answers", q: "FA25", page: 1, limit: 20 } as never);
    assert.deepEqual(searched.items.map((i) => i.threadId), ["9001"]);
    const noImages = await m.service.gaps({ gap: "no_images", page: 1, limit: 20 } as never);
    assert.equal(noImages.meta.total, 0);

    const summary = await m.service.gapSummary({});
    assert.deepEqual(summary, { noExam: 1, noImages: 0, noAnswers: all.items.filter((i) => i.gap === "no_answers").length });
  });
});
