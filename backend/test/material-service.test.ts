import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MATERIAL_MAX_PAGES } from "../src/constants/materials";
import type { MaterialUploadRow, NewUpload, PageRow } from "../src/repositories/material.repository";
import { AppError } from "../src/rules/error";
import { createTokenLedger, type TokenLedgerStore } from "../src/services/ai-token-ledger.service";
import { buildResult, createMaterialService, type MaterialServiceDeps, type MaterialServiceStore } from "../src/services/material.service";
import type { PdfEngine } from "../src/services/materials/pdf-extractor";
import { buildPdf } from "./helpers/pdf";

// API của Phân tích slide với kho trong bộ nhớ: khoá Pro, kiểm tra PDF, trùng tệp, quyền chủ sở hữu (404), giới hạn token.

const NOW = new Date("2026-11-11T12:00:00.000Z");
const PRO = { id: 1, role: "USER" as const };
const FREE = { id: 2, role: "USER" as const };
const ADMIN = { id: 3, role: "ADMIN" as const };
const SUBJECT = { id: 10, code: "OSG202", name: "Operating Systems" };
const CHAPTERS = [
  { number: 1, title: "Processes", topics: ["1.1 Process"] },
  { number: 2, title: "Memory", topics: ["2.1 Paging"] },
];

function setup({ pages = 3, aiOn = true, usedTokens = 0, chapters = CHAPTERS }: { pages?: number; aiOn?: boolean; usedTokens?: number; chapters?: typeof CHAPTERS } = {}) {
  const rows: MaterialUploadRow[] = [];
  const written = new Map<number, number>();
  let notified = 0;
  const repo: MaterialServiceStore = {
    async create(d: NewUpload) {
      const row: MaterialUploadRow = { id: rows.length + 1, ...d, status: "QUEUED", error: null, progressDone: 0, progressTotal: 0, createdAt: NOW, finishedAt: null };
      rows.push(row);
      return row;
    },
    findOwned: async (id, userId, now) => rows.find((r) => r.id === id && r.userId === userId && r.expiresAt > now) ?? null,
    listByUser: async (userId, now) => rows.filter((r) => r.userId === userId && r.expiresAt > now).reverse(),
    findDuplicate: async (userId, subjectId, hash, now) => rows.find((r) => r.userId === userId && r.subjectId === subjectId && r.fileHash === hash && r.status !== "FAILED" && r.expiresAt > now) ?? null,
    countActive: async (userId) => rows.filter((r) => r.userId === userId && (r.status === "QUEUED" || r.status === "RUNNING")).length,
    async deleteOwned(id, userId) {
      const i = rows.findIndex((r) => r.id === id && r.userId === userId);
      if (i < 0) return 0;
      rows.splice(i, 1);
      return 1;
    },
    pages: async () => [],
    chapters: async () => [],
  };
  const usage: { createdAt: Date; totalTokens: number }[] = usedTokens ? [{ createdAt: new Date(NOW.getTime() - 3600_000), totalTokens: usedTokens }] : [];
  const ledgerStore: TokenLedgerStore = { record: async () => undefined, since: async (_u, _f, since) => usage.filter((u) => u.createdAt > since) };
  const pdf: PdfEngine = {
    async open() {
      return { pageCount: pages, extractPage: async () => assert.fail("not used"), renderPng: async () => assert.fail("not used"), close: async () => undefined };
    },
  };
  const deps: MaterialServiceDeps = {
    repo,
    subjects: {
      findByCode: async (code) => (code === SUBJECT.code ? SUBJECT : null),
      findManyByIds: async (ids) => (ids.includes(SUBJECT.id) ? [SUBJECT] : []),
      chapters: async () => chapters,
    },
    chapterStats: async () => [],
    isPro: async (userId) => userId === PRO.id,
    aiReady: async () => aiOn,
    ledger: createTokenLedger({ feature: "material", limit: 1_000_000, windowMs: 5 * 3600_000, store: ledgerStore }),
    pdf,
    files: {
      write: async (id, data) => void written.set(id, data.length),
      remove: async (id) => void written.delete(id),
    },
    notify: () => void notified++,
    now: () => NOW,
  };
  return { service: createMaterialService(deps), rows, written, notifiedCount: () => notified };
}

const file = (buffer = buildPdf([{ text: "Slide one about processes and threads" }]), originalname = "OS slides.pdf") => ({ buffer, originalname });

const rejectsWith = async (p: Promise<unknown>, status: number, message?: RegExp) =>
  assert.rejects(p, (err: unknown) => {
    assert.ok(err instanceof AppError, `expected AppError, got ${String(err)}`);
    assert.equal(err.status, status);
    if (message) assert.match(err.message, message);
    return true;
  });

describe("material service", () => {
  it("Pro gate: free users get 403, Pro users and admins are accepted", async () => {
    const t = setup();
    await rejectsWith(t.service.create(FREE, file(), SUBJECT.code), 403, /Pro/);
    assert.equal(t.rows.length, 0);
    const a = await t.service.create(PRO, file(), SUBJECT.code);
    assert.deepEqual(a, { id: 1, status: "QUEUED", duplicate: false });
    const b = await t.service.create(ADMIN, file(), SUBJECT.code);
    assert.equal(b.duplicate, false);
    assert.equal(t.written.size, 2); // tệp tạm cho job
    assert.equal(t.notifiedCount(), 2);
    assert.equal(t.rows[0]!.title, "OS slides");
    assert.equal(t.rows[0]!.expiresAt.getTime() - NOW.getTime(), 30 * 24 * 3600_000);
  });

  it("upload gate (runs before the file is read): 403 for free accounts, 503 when AI is off", async () => {
    await rejectsWith(setup().service.assertCanUpload(FREE), 403, /Pro/);
    await rejectsWith(setup({ aiOn: false }).service.assertCanUpload(PRO), 503);
    await setup().service.assertCanUpload(PRO);
    await setup().service.assertCanUpload(ADMIN);
  });

  it("quota endpoint reports the gate and percent, never raw token numbers", async () => {
    const t = setup({ usedTokens: 250_000 });
    const q = await t.service.quota(PRO);
    assert.deepEqual(Object.keys(q).sort(), ["isPro", "percentUsed", "resetsAt"]);
    assert.equal(q.isPro, true);
    assert.equal(q.percentUsed, 25);
    assert.equal(q.resetsAt, new Date(NOW.getTime() - 3600_000 + 5 * 3600_000).toISOString());
    assert.equal((await t.service.quota(FREE)).isPro, false);
    assert.equal((await t.service.quota(ADMIN)).isPro, true);
  });

  it("PDF validation: checks magic bytes (not the name), missing file, page limit", async () => {
    const t = setup();
    await rejectsWith(t.service.create(PRO, file(Buffer.from("PK\u0003\u0004 not a pdf"), "fake.pdf"), SUBJECT.code), 400, /PDF/);
    await rejectsWith(t.service.create(PRO, undefined, SUBJECT.code), 400);
    const big = setup({ pages: MATERIAL_MAX_PAGES + 1 });
    await rejectsWith(big.service.create(PRO, file(), SUBJECT.code), 400, new RegExp(String(MATERIAL_MAX_PAGES)));
    assert.equal(t.rows.length + big.rows.length, 0);
  });

  it("subject must exist and have chapters; AI must be enabled", async () => {
    await rejectsWith(setup().service.create(PRO, file(), "ABC123"), 400, /môn học/);
    await rejectsWith(setup({ chapters: [] }).service.create(PRO, file(), SUBJECT.code), 400, /chương/);
    await rejectsWith(setup({ aiOn: false }).service.create(PRO, file(), SUBJECT.code), 503);
  });

  it("dedupe: same user + same file + same subject returns the existing upload; FAILED ones and other users are not reused", async () => {
    const t = setup();
    const first = await t.service.create(PRO, file(), SUBJECT.code);
    const again = await t.service.create(PRO, file(), SUBJECT.code);
    assert.deepEqual(again, { id: first.id, status: "QUEUED", duplicate: true });
    assert.equal(t.rows.length, 1);

    t.rows[0]!.status = "FAILED";
    const retry = await t.service.create(PRO, file(), SUBJECT.code);
    assert.equal(retry.duplicate, false);
    const other = await t.service.create(ADMIN, file(), SUBJECT.code); // người khác: không dùng chung
    assert.equal(other.duplicate, false);
    assert.equal(t.rows.length, 3);
  });

  it("limits concurrent jobs per user", async () => {
    const t = setup();
    await t.service.create(PRO, file(buildPdf([{ text: "first deck with enough text" }])), SUBJECT.code);
    await t.service.create(PRO, file(buildPdf([{ text: "second deck with enough text" }])), SUBJECT.code);
    await rejectsWith(t.service.create(PRO, file(buildPdf([{ text: "third deck with enough text" }])), SUBJECT.code), 429);
  });

  it("token pre-check: 429 with when to retry in the message only", async () => {
    const t = setup({ usedTokens: 999_000 });
    await assert.rejects(t.service.create(PRO, file(), SUBJECT.code), (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.status, 429);
      assert.match(err.message, /Thử lại sau \d{2}:\d{2} ngày \d{2}\/\d{2}/);
      assert.match(err.message, /23:00 ngày 11\/11/); // NOW + 4 giờ, giờ Việt Nam
      assert.equal(err.errors, undefined); // không có lỗi theo field: giao diện hiện đúng lời nhắn
      return true;
    });
    assert.equal(t.rows.length, 0);
  });

  it("ownership: other users get 404 on read and delete; the owner can delete", async () => {
    const t = setup();
    const { id } = await t.service.create(PRO, file(), SUBJECT.code);
    await rejectsWith(t.service.get(ADMIN, id), 404);
    await rejectsWith(t.service.remove(FREE, id), 404);
    assert.equal((await t.service.list(FREE)).items.length, 0);

    const mine = await t.service.get(PRO, id);
    assert.equal(mine.subjectCode, SUBJECT.code);
    assert.equal(mine.status, "QUEUED");
    assert.equal("chapters" in mine, false); // chưa xong thì chưa có kết quả
    assert.equal((await t.service.list(PRO)).items[0]!.id, id);

    await t.service.remove(PRO, id);
    assert.equal(t.written.has(id), false);
    await rejectsWith(t.service.get(PRO, id), 404);
  });

  it("expired uploads are hidden even before the cleanup runs", async () => {
    const t = setup();
    const { id } = await t.service.create(PRO, file(), SUBJECT.code);
    t.rows[0]!.expiresAt = new Date(NOW.getTime() - 1);
    await rejectsWith(t.service.get(PRO, id), 404);
  });
});

describe("result assembly", () => {
  const page = (pageNo: number, chapterNumber: number | null, figure: unknown = null): PageRow => ({ pageNo, kind: figure ? "figure" : "text", text: "", figure: figure as PageRow["figure"], assigned: true, chapterNumber });

  it("joins chapter stats by the topic label at read time, lists figures and counts unmatched pages", () => {
    const fig = { type: "diagram", summary: "Sơ đồ trạng thái tiến trình", confidence: "high", components: [], relationships: [], topics: [], unreadable: [], model: "m" };
    const pages = [page(1, null), page(2, 1), page(3, 1, fig), page(4, 1), page(7, 1), page(8, 2), page(9, null)];
    const rows = [
      { chapterNumber: 2, summary: "B", keyPoints: [] },
      { chapterNumber: 1, summary: "A", keyPoints: [{ text: "x", pages: [2] }] },
    ];
    const stats = [{ chapter: "Processes", examsWithChapter: 8, totalExams: 10, confidence: "medium" }];
    const r = buildResult(pages, rows, CHAPTERS, stats);
    assert.equal(r.unmatchedPages, 2);
    assert.deepEqual(r.chapters.map((c) => c.number), [1, 2]);
    const [c1, c2] = r.chapters;
    assert.equal(c1!.title, "Processes");
    assert.equal(c1!.pageRange, "2-4, 7");
    assert.deepEqual(c1!.figures, [{ page: 3, type: "diagram", summary: "Sơ đồ trạng thái tiến trình", confidence: "high" }]);
    assert.deepEqual(c1!.stats, { examsWithChapter: 8, totalExams: 10, confidence: "medium" });
    assert.equal(c2!.stats, null); // chưa có thống kê cho chương này
    assert.deepEqual(c1!.keyPoints, [{ text: "x", pages: [2] }]);
  });
});
