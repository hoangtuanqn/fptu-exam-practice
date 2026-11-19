import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Danh sách link FuOverflow + lượt nạp trên MySQL thật (TEST_DB=1). Không gọi FuOverflow: fuoSourceService.process được thay bằng hàm giả.

const loadModules = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  service: (await import("../src/services/fuo-source.service")).fuoSourceService,
  repo: (await import("../src/repositories/fuo-source.repository")).fuoSourceRepository,
  worker: await import("../src/jobs/fuo-source.worker"),
  authMessage: (await import("../src/services/crawler/fuo-client")).FUO_AUTH_MESSAGE,
  settings: (await import("../src/repositories/setting.repository")).settingRepository,
});

const link = (id: number) => `https://fuoverflow.com/threads/de-${id}.${id}/`;
const EXAM_ID = "0190f5c2-7a10-7000-8000-000000000001";

describe("FuOverflow source runs (MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof loadModules>>;
  let admin: string;
  const realProcess = { fn: null as unknown };

  const waitFor = async (check: () => Promise<boolean>, ms = 20_000) => {
    const end = Date.now() + ms;
    while (!(await check())) {
      if (Date.now() > end) throw new Error("timeout");
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  const runFinished = async () => (await m.repo.findActiveRun()) === null;

  before(async () => {
    db = await createThrowawayDb();
    m = await loadModules();
    realProcess.fn = m.service.process;
    admin = (await m.prisma.user.create({ data: { email: "admin@test.local", fullName: "admin", password: "x", role: "ADMIN" } })).id;
  });

  after(async () => {
    if (m) m.service.process = realProcess.fn as typeof m.service.process;
    await m?.prisma.$disconnect();
    await db?.drop();
  });

  it("paste is idempotent: the same thread is stored once, invalid lines are reported", async () => {
    await assert.rejects(m.service.start(admin), (e: { status?: number }) => e.status === 422); // chưa có cookie/tài khoản FuOverflow
    const first = await m.service.add([link(1), link(2), "https://example.com/x", link(1).replace("/de-1.1/", "/1/page-3")].join("\n"));
    assert.equal(first.added, 2);
    assert.equal(first.existing, 0);
    assert.deepEqual(first.duplicates, [{ line: 4, sameAs: 1 }]);
    assert.deepEqual(first.rejected.map((r) => r.line), [3]);
    const again = await m.service.add(`${link(2)}\n${link(3)}`);
    assert.deepEqual({ added: again.added, existing: again.existing }, { added: 1, existing: 1 });
    assert.equal(await m.prisma.fuoSourceUrl.count(), 3);
  });

  it("afterScan is idempotent while a run is active, start does nothing then, and the run goes RUNNING -> DONE", async () => {
    // Chưa đăng ký worker: lượt nằm ở RUNNING để kiểm tra lần gọi thứ hai
    await m.service.afterScan(admin);
    await m.service.afterScan(admin);
    const a = await m.service.status();
    assert.equal(await m.prisma.fuoSourceRun.count(), 1);
    assert.deepEqual({ status: a.run?.status, total: a.run?.total, queued: a.counts.QUEUED, scan: a.scan }, { status: "RUNNING", total: 3, queued: 3, scan: null });
    const b = await m.service.start(admin); // đang có lượt nạp: không quét, không cần cookie
    assert.deepEqual({ started: b.started, run: b.run?.id }, { started: false, run: a.run?.id });
    assert.equal(await m.prisma.fuoCatalogRun.count(), 0);

    const seen: string[] = [];
    const commentsAtSeen: (Date | null)[] = [];
    m.service.process = async (threadId: string, _by: string | null, commentsAt: Date | null) => {
      seen.push(threadId);
      commentsAtSeen.push(commentsAt);
      if (threadId === "2") throw new Error("Không tải được Q1: HTTP 404");
      return threadId === "1"
        ? { examId: EXAM_ID, result: "IMPORTED" as const, addedQuestions: 0, commentsRefreshed: true }
        : { examId: EXAM_ID, result: "UPDATED" as const, addedQuestions: 4, commentsRefreshed: false };
    };
    m.worker.startFuoSourceWorker(); // chạy tiếp lượt RUNNING như lúc khởi động server
    await waitFor(runFinished);
    assert.deepEqual(seen.sort(), ["1", "2", "3"]); // mỗi link đúng một lần

    const s = await m.service.status();
    assert.equal(s.run?.status, "DONE");
    assert.deepEqual(
      { total: s.run?.total, done: s.run?.done, failed: s.run?.failed, imported: s.run?.imported, updated: s.run?.updated, running: s.run?.running },
      { total: 3, done: 2, failed: 1, imported: 1, updated: 1, running: 0 },
    );
    assert.match(s.run?.lastError ?? "", /404/);
    assert.deepEqual({ DONE: s.counts.DONE, FAILED: s.counts.FAILED, QUEUED: s.counts.QUEUED }, { DONE: 2, FAILED: 1, QUEUED: 0 });
    const failed = await m.service.list({ page: 1, limit: 20 }, "FAILED");
    assert.deepEqual(failed.items.map((i) => [i.threadId, i.status, i.lastError]), [["2", "FAILED", "Không tải được Q1: HTTP 404"]]);
    assert.equal((await m.prisma.fuoSourceUrl.findUnique({ where: { threadId: "1" } }))?.examId, EXAM_ID);
    assert.ok(commentsAtSeen.every((d) => d === null)); // chưa lượt nào lấy bình luận
    const done = await m.service.list({ page: 1, limit: 20 }, "DONE");
    assert.deepEqual(done.items.map((i) => [i.threadId, i.addedQuestions]).sort(), [["1", 0], ["3", 4]]);
    const rows = await m.prisma.fuoSourceUrl.findMany({ orderBy: { threadId: "asc" }, select: { threadId: true, commentsAt: true } });
    assert.deepEqual(rows.map((r) => [r.threadId, r.commentsAt !== null]), [["1", true], ["2", false], ["3", false]]);
    assert.deepEqual(await m.repo.runSummary(s.run!.id), { addedQuestions: 4, examsWithNewQuestions: 1 });
  });

  it("a FuOverflow login failure stops the run as NEEDS_AUTH, and the next run resumes the same run", async () => {
    let calls = 0;
    m.service.process = async () => {
      calls++;
      throw new Error(m.authMessage);
    };
    await m.service.afterScan(admin); // link đã xong và bài không đổi không vào hàng chờ: chỉ link lỗi (2)
    const started = await m.service.status();
    assert.equal(started.run?.total, 1);
    await waitFor(runFinished);
    assert.equal(calls, 1); // dừng ngay
    const stopped = await m.service.status();
    assert.equal(stopped.run?.status, "NEEDS_AUTH");
    assert.equal(stopped.run?.id === started.run?.id, true);
    assert.equal(stopped.counts.QUEUED, 1);
    assert.equal(stopped.run?.failed, 0);

    await m.service.add(link(4)); // dán thêm trong lúc dừng: lượt tiếp tục cũng nhận
    m.service.process = async () => ({ examId: EXAM_ID, result: "UNCHANGED" as const, addedQuestions: 0, commentsRefreshed: false });
    await m.service.afterScan(admin);
    const resumed = await m.service.status();
    assert.equal(resumed.run?.id, started.run?.id);
    await waitFor(runFinished);
    const s = await m.service.status();
    assert.deepEqual({ status: s.run?.status, total: s.run?.total, done: s.run?.done }, { status: "DONE", total: 2, done: 2 });
    assert.equal(await m.prisma.fuoSourceRun.count(), 2);
  });

  it("afterScan adds FE catalog threads and queues only new links and links whose thread changed on FuOverflow", async () => {
    const future = new Date(Date.now() + 60_000);
    const thread = (threadId: string, kind: "FE" | "PE", syncedAt?: Date) => ({ threadId, subjectCode: "TST101", title: `t${threadId}`, kind, ...(syncedAt && { syncedAt }) });
    await m.prisma.fuoThread.createMany({ data: [thread("1", "FE", future), thread("3", "FE", new Date(0)), thread("5", "FE"), thread("6", "FE"), thread("7", "PE")] });
    await m.prisma.exam.create({ data: { threadId: "6", title: "t6", sourceUrl: link(6), totalQuestions: 1, answerSource: "AI" } });
    const seen: string[] = [];
    m.service.process = async (threadId: string) => {
      seen.push(threadId);
      return { examId: EXAM_ID, result: "UNCHANGED" as const, addedQuestions: 0, commentsRefreshed: false };
    };
    await m.service.afterScan(admin);
    await waitFor(runFinished);
    assert.deepEqual(seen.sort(), ["1", "5"]); // 1: bài đổi sau lần xử lý; 5: bài FE mới. 3: không đổi; 6: đã có đề; 7: không phải FE
    const six = await m.prisma.fuoSourceUrl.findUnique({ where: { threadId: "6" } });
    assert.deepEqual({ status: six?.status, url: six?.url, processed: six?.processedAt !== null }, { status: "DONE", url: "https://fuoverflow.com/threads/6/", processed: true });
    assert.equal(await m.prisma.fuoSourceUrl.count({ where: { threadId: "7" } }), 0);
    await m.prisma.fuoThread.update({ where: { threadId: "1" }, data: { syncedAt: new Date(0) } });
    await m.service.afterScan(admin); // gọi lại: không còn gì để nạp
    await waitFor(runFinished);
    assert.equal((await m.service.status()).run?.total, 0);
  });

  it("the run waits while user crawl jobs are queued or running, then continues", async () => {
    let busy = true;
    let calls = 0;
    const realWaiting = m.service.userImportsWaiting;
    m.service.userImportsWaiting = async () => busy;
    m.service.process = async () => {
      calls++;
      return { examId: EXAM_ID, result: "UNCHANGED" as const, addedQuestions: 0, commentsRefreshed: false };
    };
    await m.service.add(link(8));
    await m.service.afterScan(admin);
    await new Promise((r) => setTimeout(r, 1500));
    assert.equal(calls, 0); // chưa nhận link nào khi người dùng đang chờ
    assert.equal((await m.service.status()).counts.RUNNING, 0);
    busy = false;
    await waitFor(runFinished);
    assert.equal(calls, 1);
    m.service.userImportsWaiting = realWaiting;

    // Hàm thật đọc crawl_jobs: có job QUEUED thì báo bận
    assert.equal(await m.service.userImportsWaiting(), false);
    const job = await m.prisma.crawlJob.create({ data: { threadId: "77", userId: admin } });
    assert.equal(await m.service.userImportsWaiting(), true);
    await m.prisma.crawlJob.update({ where: { id: job.id }, data: { status: "DONE" } });
    assert.equal(await m.service.userImportsWaiting(), false);
  });

  it("two starts at the same moment create a single incremental catalog scan, shown in the status", async () => {
    await m.settings.setMany({ "crawler.cookie": "xf_user=test" });
    const [a, b] = await Promise.all([m.service.start(admin), m.service.start(admin)]);
    assert.equal([a.started, b.started].filter(Boolean).length, 1);
    const runs = await m.prisma.fuoCatalogRun.findMany();
    assert.deepEqual(runs.map((r) => [r.status, r.autoImport]), [["RUNNING", true]]);
    const s = await m.service.status(); // worker quét chưa đăng ký ở test này: lượt nằm ở RUNNING
    assert.deepEqual(s.scan, { status: "RUNNING", subjectsTotal: 0, subjectsDone: 0, subjectsFailed: 0, currentSubject: null, threadsNew: 0, threadsUpdated: 0, lastError: null });
    assert.equal((await m.service.start(admin)).started, false); // đang quét: không tạo thêm
    await m.prisma.fuoCatalogRun.updateMany({ data: { status: "DONE", activeLock: null } });
    assert.equal((await m.service.status()).scan, null);
  });

  it("appending questions to an existing exam keeps ids and answers of the old ones and never lowers the total", async () => {
    const { examRepository } = await import("../src/repositories/exam.repository");
    const exam = await m.prisma.exam.create({ data: { threadId: "9001", title: "TST101 merge", sourceUrl: link(9001), totalQuestions: 2, answerSource: "AI" } });
    const q = (n: number, answer: string) => ({ number: n, name: `Q${n}`, imagePath: `exams/9001/images/Q${n}.webp`, sourceImage: `s${n}`, answer });
    await m.prisma.examQuestion.createMany({ data: [q(1, "A"), q(2, "B")].map((x) => ({ ...x, examId: exam.id })) });
    const before = await m.prisma.examQuestion.findMany({ where: { examId: exam.id }, orderBy: { number: "asc" } });

    await examRepository.appendQuestions(exam.id, [q(2, ""), q(3, "")], 3); // câu 2 đã có: bỏ qua, không ghi đè
    const after = await m.prisma.examQuestion.findMany({ where: { examId: exam.id }, orderBy: { number: "asc" } });
    assert.deepEqual(after.slice(0, 2).map((x) => [x.id, x.answer]), before.map((x) => [x.id, x.answer]));
    assert.deepEqual(after.map((x) => [x.number, x.answer]), [[1, "A"], [2, "B"], [3, ""]]);
    assert.equal((await m.prisma.exam.findUnique({ where: { id: exam.id } }))?.totalQuestions, 3);
    await examRepository.appendQuestions(exam.id, [], 2); // không bao giờ hạ tổng số câu
    assert.equal((await m.prisma.exam.findUnique({ where: { id: exam.id } }))?.totalQuestions, 3);
  });

  it("RUNNING rows left by a restart are queued again", async () => {
    await m.prisma.fuoSourceUrl.updateMany({ where: { threadId: "1" }, data: { status: "RUNNING" } });
    assert.equal((await m.repo.requeueRunning()).count, 1);
    assert.equal((await m.prisma.fuoSourceUrl.findUnique({ where: { threadId: "1" } }))?.status, "QUEUED");
  });
});
