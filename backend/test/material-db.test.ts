import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";
import { buildPdf } from "./helpers/pdf";

// Phân tích slide với MySQL thật trên database dùng một lần (TEST_DB=1 npm test). Module đụng DB được import ĐỘNG sau khi
// DATABASE_URL đã trỏ sang database đó. Claude là client giả; PDF là tệp dựng trong test và đọc bằng pdf.js thật.

const loadModules = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  repo: (await import("../src/repositories/material.repository")).materialRepository,
  usageRepo: (await import("../src/repositories/ai-token-usage.repository")).aiTokenUsageRepository,
  subjects: (await import("../src/repositories/subject.repository")).subjectRepository,
  ledger: await import("../src/services/ai-token-ledger.service"),
  job: await import("../src/services/material-job.service"),
  pdf: (await import("../src/services/materials/pdf-extractor")).pdfjsEngine,
  temp: await import("../src/services/materials/temp-files"),
});
type Mods = Awaited<ReturnType<typeof loadModules>>;

const DAY = 24 * 3600_000;

describe("material analysis (throwaway MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb | undefined;
  let m: Mods;
  let userId = 0;
  let otherId = 0;
  let subjectId = 0;
  let tmpDir = "";

  before(
    async () => {
      db = await createThrowawayDb();
      m = await loadModules();
      userId = (await m.prisma.user.create({ data: { email: "slides@test.local", fullName: "Slides", password: "x" } })).id;
      otherId = (await m.prisma.user.create({ data: { email: "other@test.local", fullName: "Other", password: "x" } })).id;
      const subject = await m.prisma.subject.create({ data: { code: "OSG202", name: "Operating Systems" } });
      subjectId = subject.id;
      await m.prisma.subjectChapter.createMany({
        data: [
          { subjectId, number: 1, title: "Processes", topics: ["1.1 Process"] },
          { subjectId, number: 2, title: "Memory", topics: ["2.1 Paging"] },
        ],
      });
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "fepass-material-test-"));
    },
    { timeout: 180_000 },
  );

  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true });
  });

  const newUpload = (owner = userId, fileHash = "a".repeat(64), expiresAt = new Date(Date.now() + 30 * DAY)) =>
    m.repo.create({ userId: owner, subjectId, title: "Deck", fileHash, pageCount: 3, expiresAt });

  it("token ledger reads the rolling window from ai_token_usage per user and feature", async () => {
    const ledger = m.ledger.createTokenLedger({ feature: "material", limit: 10_000, windowMs: 5 * 3600_000, store: m.usageRepo });
    await ledger.record(userId, { input: 1000, output: 500, cacheCreation: 500 });
    await m.prisma.aiTokenUsage.create({ data: { userId, feature: "material", inputTokens: 9000, outputTokens: 0, totalTokens: 9000, createdAt: new Date(Date.now() - 6 * 3600_000) } });
    await m.prisma.aiTokenUsage.create({ data: { userId, feature: "other", inputTokens: 9000, outputTokens: 0, totalTokens: 9000 } });
    const s = await ledger.status(userId);
    assert.equal(s.used, 2000);
    assert.equal(s.percentUsed, 20);
    assert.equal((await ledger.status(otherId)).used, 0);
  });

  it("dedupe and ownership queries", async () => {
    const now = new Date();
    const a = await newUpload(userId, "b".repeat(64));
    assert.equal((await m.repo.findDuplicate(userId, subjectId, "b".repeat(64), now))?.id, a.id);
    assert.equal(await m.repo.findDuplicate(otherId, subjectId, "b".repeat(64), now), null);
    await m.repo.finish(a.id, "FAILED", "x", now);
    assert.equal(await m.repo.findDuplicate(userId, subjectId, "b".repeat(64), now), null); // bỏ qua bản lỗi
    assert.equal(await m.repo.findOwned(a.id, otherId, now), null);
    assert.equal((await m.repo.findOwned(a.id, userId, now))?.id, a.id);
    assert.equal(await m.repo.deleteOwned(a.id, otherId), 0);
    assert.equal(await m.repo.deleteOwned(a.id, userId), 1);
  });

  it("runs a real job: pdf.js extraction, fake Claude, rows written, PDF deleted; restart requeues RUNNING", async () => {
    const temp = m.temp.createTempFiles(tmpDir);
    const upload = await newUpload(userId, "c".repeat(64));
    await temp.write(
      upload.id,
      buildPdf([{ text: "Process states: new, ready, running, waiting" }, { text: "Process state diagram with transitions", image: { x: 0, y: 0, w: 500, h: 400 } }, { text: "Paging and page tables in memory" }]),
    );
    const claimed = await m.repo.claimNext();
    assert.equal(claimed?.id, upload.id);
    assert.equal(await m.repo.claimNext(), null);
    assert.equal(await m.repo.requeueRunning(), 1); // như khởi động lại giữa chừng
    assert.equal((await m.repo.claimNext())?.id, upload.id);

    const client = {
      async call(req: { schema: Record<string, unknown>; content: { type: string; text?: string }[] }) {
        const required = (req.schema as { required: string[] }).required;
        const text = required.includes("figure_type")
          ? JSON.stringify({ figure_type: "diagram", components: ["New", "Ready"], relationships: ["New -> Ready"], summary: "Sơ đồ trạng thái", topics: [], confidence: "high", unreadable: [] })
          : required.includes("pages")
            ? JSON.stringify({ pages: [{ page: 1, chapter: 1 }, { page: 2, chapter: 1 }, { page: 3, chapter: 2 }] })
            : JSON.stringify({ summary: "Tóm tắt", keyPoints: [{ text: "Ý", pages: [1, 2, 3] }] });
        return { text, usage: { input: 100, output: 50, cacheCreation: 0, cacheRead: 0 }, stopReason: "end_turn" };
      },
    };
    const run = m.job.createMaterialJob({
      store: m.repo,
      subject: async (id) => ({ name: "Operating Systems", chapters: await m.subjects.chapters(id) }),
      client: async () => client,
      ledger: m.ledger.createTokenLedger({ feature: "material", limit: 1_000_000, windowMs: 5 * 3600_000, store: m.usageRepo }),
      pdf: m.pdf,
      files: temp,
      now: () => new Date(),
      log: () => undefined,
    });
    assert.equal(await run(upload.id), "DONE");

    const row = await m.repo.findById(upload.id);
    assert.equal(row?.status, "DONE");
    assert.equal(row?.progressDone, row?.progressTotal);
    const pages = await m.repo.pages(upload.id);
    assert.deepEqual(pages.map((p) => [p.pageNo, p.kind, p.chapterNumber]), [
      [1, "text", 1],
      [2, "figure", 1],
      [3, "text", 2],
    ]);
    assert.equal((pages[1]!.figure as { summary: string }).summary, "Sơ đồ trạng thái");
    const chapters = await m.repo.chapters(upload.id);
    assert.deepEqual(chapters.map((c) => [c.chapterNumber, c.keyPoints]), [
      [1, [{ text: "Ý", pages: [1, 2] }]],
      [2, [{ text: "Ý", pages: [3] }]],
    ]);
    assert.equal(await temp.read(upload.id), null); // PDF gốc đã xoá
    assert.equal(await m.prisma.aiTokenUsage.count({ where: { userId, feature: "material", totalTokens: 150 } }), 4);
  });

  it("cleanup deletes expired uploads with their pages, orphan temp files and token rows past the window", async () => {
    const temp = m.temp.createTempFiles(tmpDir);
    const expired = await newUpload(userId, "d".repeat(64), new Date(Date.now() - 1000));
    await m.repo.savePages(expired.id, [{ pageNo: 1, kind: "text", text: "x" }]);
    await m.repo.finish(expired.id, "DONE", null, new Date());
    const active = await newUpload(userId, "e".repeat(64));
    await temp.write(active.id, Buffer.from("%PDF-1.4"));
    await temp.write(999_999, Buffer.from("%PDF-1.4")); // không có job nào
    await fs.writeFile(path.join(tmpDir, "stray.tmp"), "x");

    const later = new Date(Date.now() + 2 * 3600_000); // tệp đủ cũ để bị coi là mồ côi
    const keepMs = (await import("../src/constants/materials")).AI_TOKEN_USAGE_KEEP_MS;
    const old = await m.prisma.aiTokenUsage.create({ data: { userId, feature: "material", inputTokens: 1, outputTokens: 0, totalTokens: 1, createdAt: new Date(later.getTime() - keepMs - 1000) } });
    const recent = await m.prisma.aiTokenUsage.create({ data: { userId, feature: "material", inputTokens: 1, outputTokens: 0, totalTokens: 1, createdAt: new Date(later.getTime() - keepMs + 60_000) } });
    const r = await m.job.materialJobService.cleanup(later, temp);
    assert.ok(r.usageRows >= 1);
    assert.equal(await m.prisma.aiTokenUsage.count({ where: { id: old.id } }), 0); // đã ra khỏi cửa sổ: xoá
    assert.equal(await m.prisma.aiTokenUsage.count({ where: { id: recent.id } }), 1); // còn trong cửa sổ + biên: giữ
    assert.ok(r.expired >= 1);
    assert.equal(r.orphanFiles, 2);
    assert.equal(await m.repo.findById(expired.id), null);
    assert.equal(await m.prisma.materialPage.count({ where: { uploadId: expired.id } }), 0);
    assert.notEqual(await temp.read(active.id), null); // job đang chờ: giữ tệp
  });
});
