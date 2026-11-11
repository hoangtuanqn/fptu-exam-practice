import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { FINGERPRINT_MODEL, groupThresholdFor } from "../src/constants/similarity";
import { recencyScore } from "../src/utils/frequency-stats";
import { Rating } from "../src/utils/fsrs";
import { flipBits, randomHash } from "./helpers/fingerprints";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Test với MySQL thật trên một database dùng một lần (TEST_DB=1 npm test). Mọi module đụng DB được import ĐỘNG sau khi
// DATABASE_URL đã trỏ sang database đó, để PrismaClient dùng chung của app không bao giờ nối vào database thật.

const loadModules = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  embed: (await import("../src/services/question-embedding.service")).questionEmbeddingService,
  provider: new (await import("../src/services/embedding")).FingerprintEmbeddingProvider(),
  group: (await import("../src/services/question-group.service")).groupSimilarQuestions,
  groupRepo: (await import("../src/repositories/question-group.repository")).questionGroupRepository,
  subjects: (await import("../src/repositories/subject.repository")).subjectRepository,
  stats: (await import("../src/services/frequency-stats.service")).frequencyStatsService,
  fsrs: (await import("../src/services/fsrs-review.service")).fsrsReviewService,
  job: (await import("../src/services/similarity-job.service")).similarityJobService,
});
type Mods = Awaited<ReturnType<typeof loadModules>>;

const day = (s: string) => new Date(`${s}T00:00:00.000Z`);
const EXAM_DATES = ["2020-01-01", "2021-01-01", "2022-01-01", "2023-01-01", "2024-01-01"].map(day);
const A = randomHash(101);
const B = randomHash(102);
const C = randomHash(103);
const D = randomHash(104);

type Q = { exam: number; number: number; topic: string | null; hash: Uint8Array<ArrayBuffer> | null; isReference?: boolean };
// exam = chỉ số trong EXAM_DATES (0..4), 5 = đề DEFAULT (không tính), 6 = đề của môn khác
const QUESTIONS: Q[] = [
  { exam: 0, number: 1, topic: "Ch1", hash: A },
  { exam: 0, number: 2, topic: "Ch1", hash: randomHash(201) },
  { exam: 0, number: 3, topic: "Ch3", hash: C },
  { exam: 1, number: 1, topic: "Ch1", hash: flipBits(A, [3]) },
  { exam: 1, number: 2, topic: "Ch3", hash: flipBits(C, [1]) },
  { exam: 2, number: 1, topic: "Ch1", hash: flipBits(A, [3, 500]) },
  { exam: 2, number: 2, topic: "Ch4", hash: D },
  { exam: 2, number: 3, topic: "Ch4", hash: flipBits(D, [2]) }, // cùng đề với câu trên: không được gộp
  { exam: 3, number: 1, topic: "Ch2", hash: B },
  { exam: 3, number: 2, topic: null, hash: flipBits(A, [9]) }, // chưa gắn chương: không gộp với Ch1
  { exam: 4, number: 1, topic: "Ch2", hash: flipBits(B, [4]) },
  { exam: 4, number: 2, topic: "Ch1", hash: randomHash(202) },
  { exam: 4, number: 3, topic: "Ch1", hash: null }, // chưa có dấu vân tay: bỏ qua khi tạo vector
  { exam: 4, number: 9, topic: "Ch1", hash: A, isReference: true },
  { exam: 5, number: 1, topic: "Ch1", hash: A },
  { exam: 6, number: 1, topic: "Ch1", hash: A },
];

describe("database (throwaway MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb | undefined;
  let m: Mods;
  let subjectId = 0;
  let userId = 0;
  const qid = new Map<string, number>(); // "exam:number" -> id
  const examIds: number[] = [];
  const examIdOf = (i: number) => examIds[i]!;
  const actor = () => ({ owner: { userId }, isAdmin: false });

  before(
    async () => {
      db = await createThrowawayDb();
      m = await loadModules();
      const subject = await m.prisma.subject.create({ data: { code: "TST101", name: "Test subject" } });
      await m.prisma.subject.create({ data: { code: "OTH202", name: "Other subject" } });
      subjectId = subject.id;
      userId = (await m.prisma.user.create({ data: { email: "fsrs@test.local", fullName: "Test", password: "x" } })).id;

      for (let i = 0; i < 7; i++) {
        const exam = await m.prisma.exam.create({
          data: {
            threadId: `t${i}`,
            title: i === 6 ? `OTH202 exam ${i}` : `TST101 exam ${i}`,
            sourceUrl: "https://example.invalid",
            totalQuestions: 3,
            answerSource: i === 5 ? "DEFAULT" : i % 2 ? "AI" : "MANUAL",
            subjectCode: i === 6 ? "OTH202" : "TST101",
            postedAt: i < 5 ? EXAM_DATES[i]! : day("2024-06-01"),
          },
        });
        examIds.push(exam.id);
      }
      for (const q of QUESTIONS) {
        const row = await m.prisma.examQuestion.create({
          data: { examId: examIds[q.exam]!, number: q.number, name: `q${q.number}`, imagePath: `x/${q.exam}-${q.number}.png`, sourceImage: "-", topic: q.topic, imageHash: q.hash, isReference: q.isReference ?? false },
        });
        qid.set(`${q.exam}:${q.number}`, row.id);
      }
      // Kho đề của người dùng FSRS: mọi đề trừ đề 2 (để thử 404) và đề của môn khác
      for (const i of [0, 1, 3, 4, 5]) await m.prisma.userExam.create({ data: { userId, examId: examIds[i]! } });
    },
    { timeout: 300_000 },
  );

  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
  });

  const id = (key: string) => qid.get(key)!;
  const expectedGroups = () => [[id("0:1"), id("1:1"), id("2:1")], [id("0:3"), id("1:2")], [id("3:1"), id("4:1")]].sort((x, y) => x[0]! - y[0]!);

  it("embedMissing embeds only missing questions, in batches, and is idempotent", async () => {
    const subject = (await m.subjects.findById(subjectId))!;
    const first = await m.embed.embedMissing(subject, m.provider, { batchSize: 5 });
    assert.deepEqual(first, { model: FINGERPRINT_MODEL, embedded: 12, skipped: 1, batches: 3 });
    const second = await m.embed.embedMissing(subject, m.provider, { batchSize: 5 });
    assert.deepEqual(second, { model: FINGERPRINT_MODEL, embedded: 0, skipped: 1, batches: 1 });
    assert.equal(await m.prisma.questionEmbedding.count(), 12); // không có câu của môn khác, đề DEFAULT, tài liệu tham khảo
  });

  it("dry run writes nothing", async () => {
    const r = await m.group(subjectId, { dryRun: true });
    assert.equal(r.written, false);
    assert.deepEqual(r.groups, expectedGroups());
    assert.equal(await m.prisma.questionGroup.count(), 0);
  });

  it("groupSimilarQuestions stores the expected groups and a rerun yields the same groups", async () => {
    const r1 = await m.group(subjectId, {});
    assert.equal(r1.threshold, groupThresholdFor(FINGERPRINT_MODEL));
    assert.deepEqual(r1.groups, expectedGroups());
    const stored1 = await m.groupRepo.membersOf(subjectId);
    await m.group(subjectId, {});
    const stored2 = await m.groupRepo.membersOf(subjectId);
    assert.deepEqual(stored1, expectedGroups());
    assert.deepEqual(stored2, stored1);
    assert.equal(await m.prisma.questionGroup.count({ where: { subjectId } }), 3);
    assert.equal(await m.prisma.questionGroupMember.count({ where: { subjectId } }), 7);
  });

  it("replace is one transaction: a failing write keeps the previous groups", async () => {
    const before = await m.groupRepo.membersOf(subjectId);
    await assert.rejects(m.groupRepo.replaceForSubject(subjectId, FINGERPRINT_MODEL, 0.99, [[id("0:1"), 99_999_999]]));
    assert.deepEqual(await m.groupRepo.membersOf(subjectId), before);
  });

  it("stats:refresh computes exact chapter and group frequencies, idempotently", async () => {
    const subject = (await m.subjects.findById(subjectId))!;
    const now = new Date("2026-01-01T00:00:00.000Z");
    const first = await m.stats.refresh(subject, { now });
    const second = await m.stats.refresh(subject, { now });
    assert.deepEqual(first, { chapters: 4, groups: 3 });
    assert.deepEqual(second, first);

    const chapters = await m.stats.chapterStats(subjectId);
    assert.equal(chapters.totalExams, 5);
    const byName = new Map(chapters.items.map((c) => [c.chapter, c]));
    const expect = { Ch1: [6, 4, [0, 1, 2, 4]], Ch2: [2, 2, [3, 4]], Ch3: [2, 2, [0, 1]], Ch4: [2, 1, [2]] } as const;
    for (const [name, [count, exams, idx]] of Object.entries(expect)) {
      const c = byName.get(name)!;
      assert.equal(c.questionCount, count, name);
      assert.equal(c.examsWithChapter, exams, name);
      assert.equal(c.totalExams, 5);
      assert.ok(Math.abs(c.avgQuestionsPerExam - count / 5) < 1e-9, name);
      assert.ok(Math.abs(c.recencyScore - recencyScore(EXAM_DATES, idx)) < 1e-9, `${name} ${c.recencyScore}`);
      assert.equal(c.confidence, "medium");
    }
    assert.equal(chapters.items.length, 4);
    assert.ok(byName.get("Ch2")!.recencyScore > byName.get("Ch3")!.recencyScore, "recent chapter must weigh more than old one");
    assert.deepEqual(
      chapters.items.map((c) => c.chapter),
      ["Ch1", "Ch2", "Ch3", "Ch4"],
    );

    const hot = await m.stats.hotQuestions(subjectId, 20, undefined);
    assert.equal(hot.total, 3);
    assert.equal(hot.locked, false);
    assert.deepEqual(
      hot.items.map((h) => [h.examsWithGroup, h.question.id, h.chapter]),
      [
        [3, id("2:1"), "Ch1"],
        [2, id("4:1"), "Ch2"],
        [2, id("1:2"), "Ch3"],
      ],
    );
    assert.ok(Math.abs(hot.items[0]!.recencyScore - recencyScore(EXAM_DATES, [0, 1, 2])) < 1e-9);
    assert.ok(hot.items[1]!.recencyScore > hot.items[2]!.recencyScore);
    assert.equal(hot.items[0]!.lastSeenAt?.toISOString(), EXAM_DATES[2]!.toISOString());
    assert.equal((await m.stats.hotQuestions(subjectId, 1, undefined)).items.length, 1);
  });

  it("FSRS: persists card + log in one go, wrong is due sooner, due list is ordered", async () => {
    const me = actor();
    const T0 = new Date("2026-03-01T10:00:00.000Z");
    const wrong = await m.fsrs.submitReview(me, id("0:1"), Rating.Again, T0);
    const good = await m.fsrs.submitReview(me, id("0:2"), Rating.Good, T0);
    const easy = await m.fsrs.submit(me, { questionId: id("1:1"), correct: true, seconds: 3 }, T0);
    assert.ok(wrong.due < good.due && good.due < easy.due);
    assert.equal(easy.rating, Rating.Easy);

    const soon = await m.fsrs.due(me, 10, new Date(T0.getTime() + 60 * 60 * 1000));
    assert.deepEqual(
      soon.items.map((i) => i.questionId),
      [id("0:1"), id("0:2")],
    );
    assert.equal(soon.total, 2);
    assert.ok(soon.items[0]!.imageUrl.endsWith("/api/v1/files/x/0-1.png"));

    const again = await m.fsrs.submit(me, { questionId: id("0:1"), correct: true, seconds: 30 }, new Date(T0.getTime() + 5 * 60 * 1000));
    assert.equal(again.reps, 2);
    assert.equal(await m.prisma.userReviewLog.count({ where: { userId, questionId: { in: [id("0:1"), id("0:2"), id("1:1")] } } }), 4);

    const later = await m.fsrs.due(me, 10, new Date(T0.getTime() + 60 * 86_400_000));
    const dues = later.items.map((i) => i.due.getTime());
    assert.equal(later.items.length, 3);
    assert.deepEqual(dues, [...dues].sort((x, y) => x - y));

    await assert.rejects(m.fsrs.submitReview(me, id("4:9"), Rating.Good, T0), /Không tìm thấy câu hỏi/); // tài liệu tham khảo
  });

  it("FSRS: 404 for an exam outside the library or with an unusable answer source; due list hides exams removed from the library", async () => {
    const me = actor();
    const T0 = new Date("2026-03-01T10:00:00.000Z");
    await assert.rejects(m.fsrs.submitReview(me, id("2:1"), Rating.Good, T0), /Không tìm thấy đề/); // đề 2 không có trong kho
    await assert.rejects(m.fsrs.submitReview(me, id("5:1"), Rating.Good, T0), /Không tìm thấy câu hỏi/); // đề DEFAULT (đã có trong kho)
    await assert.rejects(m.fsrs.submitReview({ owner: { guestId: "g".repeat(20) }, isAdmin: false }, id("0:1"), Rating.Good, T0));
    assert.equal(await m.prisma.userQuestionCard.count({ where: { userId, questionId: { in: [id("2:1"), id("5:1")] } } }), 0);

    await m.fsrs.submitReview(me, id("3:1"), Rating.Again, T0);
    const far = new Date(T0.getTime() + 400 * 86_400_000);
    assert.ok((await m.fsrs.due(me, 50, far)).items.some((i) => i.questionId === id("3:1")));
    await m.prisma.userExam.deleteMany({ where: { userId, examId: examIdOf(3) } }); // người dùng bỏ đề khỏi kho
    const after = await m.fsrs.due(me, 50, far);
    assert.ok(!after.items.some((i) => i.questionId === id("3:1")));
    assert.equal(after.total, after.items.length);
    // admin vẫn thấy (giống assertAccess)
    assert.ok((await m.fsrs.due({ ...me, isAdmin: true }, 50, far)).items.some((i) => i.questionId === id("3:1")));
  });

  it("FSRS: two parallel submits for a brand-new card give one card with reps = 2 and two logs", async () => {
    const me = actor();
    const T0 = new Date("2026-03-02T10:00:00.000Z");
    const q = id("4:2");
    const results = await Promise.all([m.fsrs.submitReview(me, q, Rating.Good, T0), m.fsrs.submitReview(me, q, Rating.Good, T0)]);
    assert.deepEqual(results.map((r) => r.reps).sort(), [1, 2]);
    const cards = await m.prisma.userQuestionCard.findMany({ where: { userId, questionId: q } });
    assert.equal(cards.length, 1);
    assert.equal(cards[0]!.reps, 2);
    assert.equal(await m.prisma.userReviewLog.count({ where: { userId, questionId: q } }), 2);
  });
  it("nightly similarity job: processes changed subjects end to end, a second run does no work, an exam change re-triggers it", async () => {
    const first = (await m.job.run())!;
    // TST101 và OTH202 chưa từng chạy. Câu 4:3 chưa có dấu vân tay và không có file ảnh: thử một lần rồi để sau con trỏ
    assert.deepEqual(
      { ...first },
      { subjects: 2, eligible: 2, processed: 2, failed: 0, imagesHashed: 0, imagesUnreadable: 1, hashLimited: 0, embedded: 1, groups: 3 },
    );
    assert.deepEqual(await m.groupRepo.membersOf(subjectId), expectedGroups());
    assert.equal(await m.prisma.questionGroupStat.count({ where: { subjectId } }), 3);
    const runs = await m.prisma.similarityJobRun.findMany({ orderBy: { subjectId: "asc" } });
    assert.equal(runs.length, 2);
    assert.equal(runs.find((r) => r.subjectId === subjectId)!.hashCursor, id("4:3"));

    const groupIds = (await m.prisma.questionGroup.findMany({ select: { id: true }, orderBy: { id: "asc" } })).map((g) => g.id);
    const second = (await m.job.run())!;
    assert.equal(second.eligible, 0);
    assert.equal(second.processed + second.imagesHashed + second.imagesUnreadable + second.embedded, 0);
    assert.deepEqual((await m.prisma.questionGroup.findMany({ select: { id: true }, orderBy: { id: "asc" } })).map((g) => g.id), groupIds); // không ghi lại nhóm

    // Đề DEFAULT được giải xong: chữ ký đổi, môn được làm lại (con trỏ về 0 nên thử lại cả ảnh hỏng)
    await m.prisma.exam.update({ where: { id: examIdOf(5) }, data: { answerSource: "AI" } });
    try {
      const third = (await m.job.run())!;
      assert.equal(third.eligible, 1);
      assert.equal(third.processed, 1);
      assert.equal(third.imagesUnreadable, 1);
      assert.equal(third.embedded, 1); // câu 5:1
    } finally {
      await m.prisma.exam.update({ where: { id: examIdOf(5) }, data: { answerSource: "DEFAULT" } });
    }
    const restored = (await m.job.run())!;
    assert.equal(restored.eligible, 1);
    assert.deepEqual(await m.groupRepo.membersOf(subjectId), expectedGroups());
    assert.equal((await m.job.run())!.eligible, 0);
  });
});
