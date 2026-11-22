import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// Lượt quét danh mục FuOverflow trên MySQL thật (TEST_DB=1). Không gọi FuOverflow: fetchPage được thay bằng hàm giả.

const loadModules = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  service: (await import("../src/services/fuo-catalog.service")).fuoCatalogService,
  repo: (await import("../src/repositories/fuo-catalog.repository")).fuoCatalogRepository,
  worker: await import("../src/jobs/fuo-catalog.worker"),
  settings: (await import("../src/repositories/setting.repository")).settingRepository,
  FuoLoginRequiredError: (await import("../src/services/crawler/fuo-anon-client")).FuoLoginRequiredError,
  loginMessage: (await import("../src/services/crawler/fuo-anon-client")).FUO_LOGIN_REQUIRED_MESSAGE,
});

const CODES = Array.from({ length: 20 }, (_, i) => `TST${101 + i}`);
const INDEX = `<div class="node-main"><div class="node-title"><a href="/categories/semester-1/">Kỳ 1</a></div><ol class="node-subNodeFlatList">${CODES.map(
  (c) => `<li><a class="subNodeLink subNodeLink--forum" href="/forums/${c}/">${c}</a></li>`,
).join("")}</ol></div>`;

const row = (id: string, title: string, label?: string, replies = 0) =>
  `<div class="structItem structItem--thread"><div class="structItem-title">${label ? `<a class="labelLink" href="/forums/x/?prefix_id=1"><span class="label">${label}</span></a>` : ""}<a href="/threads/t.${id}/">${title}</a></div>
  <ul><li class="structItem-startDate"><time class="u-dt" datetime="2026-11-11T03:01:45+0700"></time></li></ul><div class="structItem-cell--meta"><dd>${replies}</dd></div></div>`;
const forum = (rows: string[], lastPage = 1) =>
  `<html data-template="forum_view"><body><ul class="pageNav-main">${lastPage > 1 ? `<li><a href="/forums/x/page-${lastPage}">${lastPage}</a></li>` : ""}</ul><div class="structItemContainer">${rows.join("")}</div></body></html>`;

describe("FuOverflow catalog runs (MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof loadModules>>;
  let admin: string;
  const real = { fetchPage: null as unknown };
  // Trang giả theo URL; `fail` cho từng mã môn: "login" (trang cần đăng nhập) hoặc "404"
  const site = { pages: new Map<string, string>(), fail: new Map<string, "login" | "404">(), requests: [] as string[] };

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
    real.fetchPage = m.service.fetchPage;
    admin = (await m.prisma.user.create({ data: { email: "admin@test.local", fullName: "admin", password: "x", role: "ADMIN" } })).id;
    m.service.fetchPage = async (url: string) => {
      site.requests.push(url);
      const code = url.match(/\/forums\/([A-Z0-9]+)\//)?.[1];
      const fail = code && site.fail.get(code);
      if (fail === "login") throw new m.FuoLoginRequiredError(url);
      if (fail === "404") throw new Error(`HTTP 404 Not Found - ${url}`);
      if (url.endsWith("/categories/subjects/")) return { html: INDEX, url };
      return { html: site.pages.get(url) ?? forum([]), url };
    };
    site.pages.set("https://fuoverflow.com/forums/TST101/", forum([row("100", "Quy định"), row("1", "TST101 - SU26 - FE", "Đề Thi FE", 3)], 2));
    site.pages.set("https://fuoverflow.com/forums/TST101/page-2", forum([row("1", "TST101 - SU26 - FE", "Đề Thi FE", 3), row("2", "TST101 PE paper", "Đề Thi PE")]));
    site.pages.set("https://fuoverflow.com/forums/TST104/", forum([row("3", "TST104 Quiz 1")]));
  });

  after(async () => {
    if (m) Object.assign(m.service, real);
    await m?.prisma.$disconnect();
    await db?.drop();
  });

  it("starts without any FuOverflow cookie or account, and refuses while a run is active (409)", async () => {
    const first = await m.service.start(admin); // worker chưa đăng ký: lượt nằm ở RUNNING
    assert.equal(first.started, true);
    assert.equal(first.run?.status, "RUNNING");
    await assert.rejects(m.service.start(admin), (e: { status?: number }) => e.status === 409);
    assert.equal(await m.prisma.fuoCatalogRun.count(), 1);
  });

  it("a page that needs login fails only that subject (no credentials, no NEEDS_AUTH); the run goes on", async () => {
    site.fail.set("TST102", "404");
    site.fail.set("TST103", "login");
    m.worker.startFuoCatalogWorker();
    await waitFor(runFinished);
    const s = await m.service.status();
    assert.equal(s.run?.status, "DONE");
    assert.deepEqual(
      { total: s.run?.subjectsTotal, done: s.run?.subjectsDone, failed: s.run?.subjectsFailed, found: s.run?.threadsFound, added: s.run?.threadsNew, current: s.run?.currentSubject },
      { total: 20, done: 18, failed: 2, found: 4, added: 4, current: null },
    );
    assert.deepEqual(s.failures.map((f) => f.code), ["TST102", "TST103"]);
    assert.match(s.failures[0]!.error ?? "", /404/);
    assert.equal(s.failures[1]!.error, m.loginMessage);
    assert.deepEqual(s.totals, { subjects: 2, threads: 4, byKind: { FE: 1, PE: 1, QUIZ: 1, OTHER: 1 } });
    const threads = await m.prisma.fuoThread.findMany({ orderBy: { threadId: "asc" }, select: { threadId: true, subjectCode: true, kind: true, label: true, replies: true } });
    assert.deepEqual(threads.map((t) => [t.threadId, t.subjectCode, t.kind, t.label, t.replies]), [
      ["1", "TST101", "FE", "Đề Thi FE", 3],
      ["100", "TST101", "OTHER", null, 0],
      ["2", "TST101", "PE", "Đề Thi PE", 0],
      ["3", "TST104", "QUIZ", null, 0],
    ]);
    assert.equal(await m.prisma.adminNotice.count({ where: { kind: "catalog.done" } }), 1);
  });

  it("the next start is a new run; each page is read once per run", async () => {
    site.fail.delete("TST103");
    site.requests.length = 0;
    const stopped = await m.service.status();
    const next = await m.service.start(admin);
    assert.notEqual(next.run?.id, stopped.run?.id);
    await waitFor(runFinished);
    const s = await m.service.status();
    assert.deepEqual(
      { status: s.run?.status, done: s.run?.subjectsDone, failed: s.run?.subjectsFailed, added: s.run?.threadsNew, updated: s.run?.threadsUpdated },
      { status: "DONE", done: 19, failed: 1, added: 0, updated: 0 },
    );
    assert.equal(await m.prisma.fuoCatalogRun.count(), 2);
    assert.equal(site.requests.filter((u) => u === "https://fuoverflow.com/forums/TST101/page-2").length, 1);
  });

  it("stops the run after too many subjects in a row need login", async () => {
    const { FUO_CATALOG_LOGIN_STREAK_MAX } = await import("../src/constants/fuo-catalog");
    for (const code of CODES) site.fail.set(code, "login");
    await m.service.start(admin);
    await waitFor(runFinished);
    const s = await m.service.status();
    assert.equal(s.run?.status, "FAILED");
    assert.match(s.run?.lastError ?? "", /cần đăng nhập/);
    assert.ok((s.run?.subjectsFailed ?? 0) >= FUO_CATALOG_LOGIN_STREAK_MAX);
    for (const code of CODES) site.fail.delete(code);
  });

  it("a new run writes only new or changed threads and never deletes vanished ones", async () => {
    site.fail.delete("TST102");
    const before100 = await m.prisma.fuoThread.findUnique({ where: { threadId: "100" } });
    site.pages.set("https://fuoverflow.com/forums/TST101/", forum([row("1", "TST101 - SU26 - FE (đã sửa)", "Đề Thi FE", 5)], 2));
    await new Promise((r) => setTimeout(r, 20)); // synced_at của bài đổi khác hẳn lần trước
    await m.service.start(admin);
    await waitFor(runFinished);
    const s = await m.service.status();
    assert.deepEqual({ status: s.run?.status, done: s.run?.subjectsDone, failed: s.run?.subjectsFailed, added: s.run?.threadsNew, updated: s.run?.threadsUpdated }, { status: "DONE", done: 20, failed: 0, added: 0, updated: 1 });
    assert.equal(s.failures.length, 0);
    const t1 = await m.prisma.fuoThread.findUnique({ where: { threadId: "1" } });
    assert.deepEqual({ title: t1?.title, replies: t1?.replies }, { title: "TST101 - SU26 - FE (đã sửa)", replies: 5 });
    const after100 = await m.prisma.fuoThread.findUnique({ where: { threadId: "100" } });
    assert.equal(after100?.syncedAt.getTime(), before100?.syncedAt.getTime()); // bài không còn trên trang: giữ nguyên, không xoá
    assert.equal(await m.prisma.fuoThread.count(), 4);
  });

  it("'Load new data' scans incrementally, records new threads per subject and starts no import run", async () => {
    const { fuoSourceService } = await import("../src/services/fuo-source.service");
    const { fuoSourceRepository } = await import("../src/repositories/fuo-source.repository");
    site.requests.length = 0;
    // TST101 không đổi từ lượt trước: chỉ đọc trang 1. TST105 chưa có bài nào: đọc hết 3 trang.
    site.pages.set("https://fuoverflow.com/forums/TST105/", forum([row("50", "TST105 - SU26 - FE", "Đề Thi FE")], 3));
    site.pages.set("https://fuoverflow.com/forums/TST105/page-2", forum([row("51", "TST105 - SP26 - FE", "Đề Thi FE")]));
    site.pages.set("https://fuoverflow.com/forums/TST105/page-3", forum([row("52", "TST105 PE", "Đề Thi PE")]));
    await m.prisma.exam.create({ data: { threadId: "51", title: "TST105 - SP26 - FE", sourceUrl: "https://fuoverflow.com/threads/51/", totalQuestions: 1, answerSource: "AI" } });

    const started = await fuoSourceService.start(admin);
    assert.equal(started.started, true);
    await waitFor(runFinished);
    assert.equal(site.requests.includes("https://fuoverflow.com/forums/TST101/page-2"), false);
    assert.equal(site.requests.includes("https://fuoverflow.com/forums/TST105/page-3"), true);
    const latest = await m.repo.findLatestRun();
    assert.deepEqual({ status: latest?.status, autoImport: latest?.autoImport, added: latest?.threadsNew }, { status: "DONE", autoImport: true, added: 3 });

    assert.equal(await fuoSourceRepository.findActiveRun(), null); // không có lượt nạp nào
    assert.equal(await m.prisma.fuoSourceRun.count(), 0);
    const s = await fuoSourceService.status();
    assert.deepEqual(
      { status: s.scan?.status, threadsNew: s.scan?.threadsNew, newBySubject: s.scan?.newBySubject, subjectsWithNew: s.scan?.subjectsWithNew },
      { status: "DONE", threadsNew: 3, newBySubject: [{ code: "TST105", threadsNew: 3 }], subjectsWithNew: 1 },
    );
    const links = await m.prisma.fuoSourceUrl.findMany({ orderBy: { threadId: "asc" }, select: { threadId: true, status: true } });
    assert.deepEqual(links.map((l) => [l.threadId, l.status]), [["51", "DONE"]]); // chỉ bài đã có đề; bài mới nằm trong kho đề (fuo_threads)
  });

  it("RUNNING subjects left by a restart are queued again; busy() sees queued user jobs", async () => {
    await m.prisma.fuoCatalogSubject.updateMany({ where: { code: "TST101" }, data: { status: "RUNNING" } });
    assert.equal((await m.repo.requeueRunning()).count, 1);
    assert.equal(await m.service.busy(), false);
    const job = await m.prisma.crawlJob.create({ data: { threadId: "77", userId: admin } });
    assert.equal(await m.service.busy(), true);
    await m.prisma.crawlJob.update({ where: { id: job.id }, data: { status: "DONE" } });
    assert.equal(await m.service.busy(), false);
  });

  it("old exams get a kind at boot from their title; FE when the title does not say", async () => {
    const { examRepository } = await import("../src/repositories/exam.repository");
    const mk = (threadId: string, title: string) => m.prisma.exam.create({ data: { threadId, title, sourceUrl: `https://fuoverflow.com/threads/${threadId}/`, totalQuestions: 0, answerSource: "MANUAL" } });
    await mk("801", "PRJ301 - SU25 - FE");
    await mk("802", "PRJ301_SU25_PE_Paper_1");
    await mk("803", "PRJ301 B5 RE");
    assert.equal(await examRepository.backfillKinds(), 3);
    const kinds = await m.prisma.exam.findMany({ orderBy: { threadId: "asc" }, select: { kind: true } });
    assert.deepEqual(kinds.map((k) => k.kind), ["FE", "PE", "FE"]);
    assert.equal(await examRepository.backfillKinds(), 0); // chạy lại: không còn gì
  });
});
