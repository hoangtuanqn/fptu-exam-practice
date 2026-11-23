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
const body = (extra: Record<string, string | undefined> = {}) => ({ title: "TST101 manual", subjectCode: "TST101", kind: undefined, answers: undefined, ...extra }) as never;

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
  });
  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
    fs.rmSync(STORAGE, { recursive: true, force: true });
  });

  let manualId = "";
  let feId = "";

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

  it("creates a second manual exam without answers as DEFAULT", async () => {
    const r = await m.service.create(admin, body({ title: "TST101 FA25 FE" }), files(webp, 1, 2));
    assert.match(r.threadId, /^m[0-9a-f]{12}$/);
    assert.deepEqual([r.title, r.answerSource, r.answered], ["TST101 FA25 FE", "DEFAULT", 0]);
    feId = r.id;
  });

  it("lists gaps with one query per page and a summary that matches", async () => {
    // Đề cũ dở dang (thiếu ảnh): no_images. feId: đủ ảnh, chưa có đáp án. Đề tải tay: Q3 trống -> vẫn thiếu đáp án
    const shell = await m.prisma.exam.create({ data: { threadId: "9002", title: "TST101 PE", subjectCode: "TST101", sourceUrl: "", totalQuestions: 5, answerSource: "PENDING", kind: "PE" } });
    await m.prisma.examQuestion.createMany({ data: [1, 2, 3].map((number) => ({ examId: shell.id, number, name: `old${number}`, imagePath: `exams/9002/images/old${number}.webp`, sourceImage: "x", answer: "" })) });
    const all = await m.service.gaps({ gap: "all", page: 1, limit: 20 } as never);
    const byId = new Map(all.items.map((i) => [i.examId, i]));
    assert.equal(byId.get(shell.id)?.gap, "no_images");
    assert.equal(byId.get(feId)?.gap, "no_answers");
    const manual = byId.get(manualId);
    assert.deepEqual([manual?.gap, manual?.questions, manual?.answered, manual?.sourceUrl], ["no_answers", 4, 3, null]);
    assert.equal(all.meta.total, all.items.length);
    assert.ok(all.items.every((i) => i.examId !== null));

    const onlyPe = await m.service.gaps({ gap: "all", kind: "PE", page: 1, limit: 20 } as never);
    assert.deepEqual(onlyPe.items.map((i) => i.examId), [shell.id]);
    const searched = await m.service.gaps({ gap: "no_answers", q: "FA25", page: 1, limit: 20 } as never);
    assert.deepEqual(searched.items.map((i) => i.examId), [feId]);
    const noImages = await m.service.gaps({ gap: "no_images", page: 1, limit: 20 } as never);
    assert.equal(noImages.meta.total, 1);
    const noExam = await m.service.gaps({ gap: "no_exam", page: 1, limit: 20 } as never);
    assert.deepEqual([noExam.items.length, noExam.meta.total], [0, 0]); // giữ bộ lọc cũ, luôn rỗng

    const summary = await m.service.gapSummary({});
    assert.deepEqual(summary, { noExam: 0, noImages: 1, noAnswers: all.items.filter((i) => i.gap === "no_answers").length });
  });
});
