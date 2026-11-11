import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MATERIAL_FALLBACK_MODEL, MATERIAL_TEXT_MODEL, MATERIAL_VISION_MODEL, type PageKind } from "../src/constants/materials";
import type { PageRow } from "../src/repositories/material.repository";
import { createTokenLedger, type TokenLedgerStore } from "../src/services/ai-token-ledger.service";
import type { MaterialClaudeClient, MaterialClaudeRequest } from "../src/services/ai/material-claude.client";
import { createMaterialJob, MATERIAL_MESSAGES, type MaterialJobDeps, type MaterialJobStore } from "../src/services/material-job.service";
import { PdfRenderUnavailableError, type PdfEngine } from "../src/services/materials/pdf-extractor";

// Máy trạng thái của job phân tích slide với kho, PDF, sổ token và client Claude giả (không DB, không gọi mạng).

const NOW = new Date("2026-11-11T12:00:00.000Z");
const USER = 7;
const CHAPTERS = [
  { number: 0, title: "Khác" },
  { number: 1, title: "Processes" },
  { number: 2, title: "Memory" },
];

interface Upload {
  id: number;
  userId: number;
  subjectId: number;
  pageCount: number;
  status: string;
  error: string | null;
  progress: [number, number];
}

function memoryStore(pageCount: number) {
  const upload: Upload = { id: 1, userId: USER, subjectId: 3, pageCount, status: "RUNNING", error: null, progress: [0, 0] };
  const pages = new Map<number, PageRow>();
  const chapters = new Map<number, { summary: string; keyPoints: unknown }>();
  let deleted = false;
  const calls = { savePages: 0 };
  const store: MaterialJobStore = {
    async findById() {
      return deleted ? null : upload;
    },
    async exists() {
      return !deleted;
    },
    async pages() {
      return [...pages.values()].sort((a, b) => a.pageNo - b.pageNo).map((p) => ({ ...p }));
    },
    async savePages(_id, list) {
      calls.savePages++;
      for (const p of list) if (!pages.has(p.pageNo)) pages.set(p.pageNo, { ...p, figure: null, assigned: false, chapterNumber: null });
    },
    async saveFigure(_id, pageNo, kind, figure) {
      const p = pages.get(pageNo)!;
      p.kind = kind;
      if (figure !== null) p.figure = figure as PageRow["figure"];
    },
    async saveAssignments(_id, map) {
      for (const [n, ch] of map) Object.assign(pages.get(n)!, { assigned: true, chapterNumber: ch });
    },
    async chapters() {
      return [...chapters.keys()].map((chapterNumber) => ({ chapterNumber }));
    },
    async saveChapter(_id, n, summary, keyPoints) {
      chapters.set(n, { summary, keyPoints });
    },
    async setProgress(_id, done, total) {
      upload.progress = [done, total];
    },
    async finish(_id, status, error) {
      upload.status = status;
      upload.error = error;
    },
  };
  return { store, upload, pages, chapters, calls, remove: () => (deleted = true) };
}

/** PDF giả: trang có trong `kinds` (1-based) theo đúng loại; đếm số lần vẽ. */
function fakePdf(kinds: PageKind[]) {
  const stats = { opened: 0, rendered: 0, closed: 0 };
  const engine: PdfEngine = {
    async open() {
      stats.opened++;
      return {
        pageCount: kinds.length,
        extractPage: async (n) => ({ pageNo: n, kind: kinds[n - 1]!, text: kinds[n - 1] === "scanned" ? "" : `Slide ${n} text about topic ${n <= 2 ? "processes" : "memory"}`, imageAreaRatio: 0 }),
        renderPng: async () => {
          stats.rendered++;
          return new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
        },
        close: async () => void stats.closed++,
      };
    },
  };
  return { engine, stats };
}

const figureJson = (confidence: string, unreadable: string[] = []) =>
  JSON.stringify({ figure_type: "diagram", components: ["A"], relationships: [], summary: `Hình (${confidence})`, topics: [], confidence, unreadable });

type Responder = (req: MaterialClaudeRequest) => { text: string; input?: number; output?: number } | Error;

/** Client giả: trả lời theo loại yêu cầu (nhận ra qua schema), ghi lại mọi yêu cầu. */
function fakeClient(respond: Responder) {
  const requests: MaterialClaudeRequest[] = [];
  const client: MaterialClaudeClient = {
    async call(req) {
      requests.push(req);
      const r = respond(req);
      if (r instanceof Error) throw r;
      return { text: r.text, usage: { input: r.input ?? 1000, output: r.output ?? 500, cacheCreation: 0, cacheRead: 0 }, stopReason: "end_turn" };
    },
  };
  return { client, requests };
}

const kindOf = (req: MaterialClaudeRequest) => {
  const required = (req.schema as { required: string[] }).required;
  if (required.includes("figure_type")) return "figure";
  if (required.includes("pages")) return "assign";
  return "chapter";
};

/** Trả lời mặc định hợp lệ: gán trang 1-2 vào chương 1, 3-4 vào chương 2, còn lại 0. */
const defaultResponder =
  (figure: (req: MaterialClaudeRequest) => string = () => figureJson("high")): Responder =>
  (req) => {
    const kind = kindOf(req);
    if (kind === "figure") return { text: figure(req) };
    const data = JSON.parse(
      (req.content[0] as { text: string }).text
        .split("<slide_data>\n")[1]!
        .split("\n</slide_data>")[0]!,
    );
    if (kind === "assign") return { text: JSON.stringify({ pages: data.pages.map((p: { page: number }) => ({ page: p.page, chapter: p.page <= 2 ? 1 : p.page <= 4 ? 2 : 0 })) }) };
    const pagesOf = data.pages.map((p: { page: number }) => p.page);
    return { text: JSON.stringify({ summary: `Tóm tắt chương ${data.chapter.number}`, keyPoints: [{ text: "Ý chính", pages: [...pagesOf, 999] }] }) };
  };

function setup({ kinds, respond, limit = 1_000_000, priorUsage = 0 }: { kinds: PageKind[]; respond: Responder; limit?: number; priorUsage?: number }) {
  const mem = memoryStore(kinds.length);
  const pdf = fakePdf(kinds);
  const ai = fakeClient(respond);
  const usage: { createdAt: Date; totalTokens: number; userId: number; feature: string }[] = [];
  if (priorUsage) usage.push({ createdAt: new Date(NOW.getTime() - 60 * 60 * 1000), totalTokens: priorUsage, userId: USER, feature: "material" });
  const ledgerStore: TokenLedgerStore = {
    async record(u) {
      usage.push({ createdAt: NOW, totalTokens: u.totalTokens, userId: u.userId, feature: u.feature });
    },
    async since(userId, feature, since) {
      return usage.filter((u) => u.userId === userId && u.feature === feature && u.createdAt > since);
    },
  };
  const files = { removed: 0, present: true };
  const logs: string[] = [];
  const deps: MaterialJobDeps = {
    store: mem.store,
    subject: async () => ({ name: "Operating Systems", chapters: CHAPTERS }),
    client: async () => ai.client,
    ledger: createTokenLedger({ feature: "material", limit, windowMs: 5 * 3600 * 1000, store: ledgerStore }),
    pdf: pdf.engine,
    files: {
      read: async () => (files.present ? new Uint8Array([1]) : null),
      remove: async () => {
        files.removed++;
        files.present = false;
      },
    },
    now: () => NOW,
    log: (m) => void logs.push(m),
  };
  return { run: createMaterialJob(deps), mem, pdf, ai, usage, files, logs, deps };
}

describe("material job state machine", () => {
  it("success: extracts, describes figure pages, assigns, summarises, marks DONE and deletes the PDF", async () => {
    const t = setup({ kinds: ["text", "figure", "text", "scanned", "text"], respond: defaultResponder() });
    assert.equal(await t.run(1), "DONE");
    assert.equal(t.mem.upload.status, "DONE");
    assert.equal(t.mem.upload.error, null);
    assert.equal(t.pdf.stats.rendered, 2); // chỉ trang hình và trang scan
    assert.ok(t.pdf.stats.closed >= 1);
    assert.equal(t.files.present, false);

    const kinds = t.ai.requests.map(kindOf);
    assert.deepEqual(kinds, ["figure", "figure", "assign", "chapter", "chapter"]);
    assert.ok(t.ai.requests.filter((r) => kindOf(r) === "figure").every((r) => r.model === MATERIAL_VISION_MODEL));
    assert.ok(t.ai.requests.filter((r) => kindOf(r) !== "figure").every((r) => r.model === MATERIAL_TEXT_MODEL));

    assert.equal(t.usage.length, 5); // mỗi lần gọi một dòng
    assert.ok(t.usage.every((u) => u.totalTokens === 1500));

    assert.equal(t.mem.pages.get(2)!.chapterNumber, 1);
    assert.equal(t.mem.pages.get(5)!.chapterNumber, null);
    assert.equal(t.mem.chapters.size, 2);
    assert.deepEqual(t.mem.chapters.get(1)!.keyPoints, [{ text: "Ý chính", pages: [1, 2] }]); // trang 999 bị bỏ
    const [done, total] = t.mem.upload.progress;
    assert.equal(done, total);
    assert.equal(total, 1 + 2 + 1 + 2);
  });

  it("falls back to Sonnet when Haiku is unsure, and keeps Sonnet's description", async () => {
    const t = setup({
      kinds: ["figure", "text"],
      respond: defaultResponder((req) => (req.model === MATERIAL_VISION_MODEL ? figureJson("medium", ["label on arrow"]) : figureJson("high"))),
    });
    assert.equal(await t.run(1), "DONE");
    const figureModels = t.ai.requests.filter((r) => kindOf(r) === "figure").map((r) => r.model);
    assert.deepEqual(figureModels, [MATERIAL_VISION_MODEL, MATERIAL_FALLBACK_MODEL]);
    assert.equal((t.mem.pages.get(1)!.figure as { model: string; confidence: string }).model, MATERIAL_FALLBACK_MODEL);
    assert.equal(t.usage.length, 4); // cả hai lần gọi hình đều được ghi
  });

  it("does not fall back when Haiku is confident", async () => {
    const t = setup({ kinds: ["figure"], respond: defaultResponder(() => figureJson("medium")) });
    assert.equal(await t.run(1), "DONE");
    assert.deepEqual(t.ai.requests.filter((r) => kindOf(r) === "figure").map((r) => r.model), [MATERIAL_VISION_MODEL]);
  });

  it("stops with a friendly FAILED message when the token window runs out mid-run; spent usage stays recorded", async () => {
    // Giới hạn đủ qua bước ước lượng (21.6k) nhưng hết sau vài lần gọi hình (mỗi lần tốn 6000 token)
    const kinds: PageKind[] = ["figure", "figure", "figure", "figure", "figure", "figure"];
    const t = setup({ kinds, limit: 22_000, respond: (req) => (kindOf(req) === "figure" ? { text: figureJson("high"), input: 5000, output: 1000 } : defaultResponder()(req)) });
    assert.equal(await t.run(1), "FAILED");
    assert.equal(t.mem.upload.status, "FAILED");
    assert.match(t.mem.upload.error!, /^Bạn đã dùng hết lượt phân tích slide hiện có\. Thử lại sau \d{2}:\d{2} ngày \d{2}\/\d{2}\.$/);
    const spent = t.usage.reduce((s, u) => s + u.totalTokens, 0);
    assert.ok(t.usage.length > 0 && t.usage.length < kinds.length);
    assert.equal(spent, t.usage.length * 6000);
    assert.ok(t.ai.requests.every((r) => kindOf(r) === "figure")); // không gán chương/tóm tắt khi đã hết
    assert.equal(t.files.present, false);
  });

  it("refuses before spending anything when the full estimate does not fit", async () => {
    const t = setup({ kinds: ["figure", "figure"], limit: 1_000_000, priorUsage: 995_000, respond: defaultResponder() });
    assert.equal(await t.run(1), "FAILED");
    assert.equal(t.ai.requests.length, 0);
    assert.match(t.mem.upload.error!, /Thử lại sau/);
    assert.equal(t.files.present, false);
  });

  it("any other error: FAILED with a short message (no internals) and the PDF is deleted", async () => {
    const t = setup({ kinds: ["figure", "text"], respond: () => new Error("Anthropic 500: InternalServerError sk-ant-secret") });
    assert.equal(await t.run(1), "FAILED");
    assert.equal(t.mem.upload.error, MATERIAL_MESSAGES.generic);
    assert.ok(!t.mem.upload.error!.includes("Anthropic"));
    assert.equal(t.files.present, false);
  });

  it("canvas library missing on the server: FAILED with a clear message, logged for admins, PDF deleted", async () => {
    const t = setup({ kinds: ["figure", "text"], respond: defaultResponder() });
    const open = t.deps.pdf.open;
    t.deps.pdf = {
      async open(data) {
        const h = await open(data);
        return { ...h, pageCount: h.pageCount, renderPng: async () => Promise.reject(new PdfRenderUnavailableError("@napi-rs/canvas: Cannot find module")) };
      },
    };
    assert.equal(await createMaterialJob(t.deps)(1), "FAILED");
    assert.equal(t.mem.upload.error, MATERIAL_MESSAGES.renderUnavailable);
    assert.ok(t.logs.some((l) => l.includes("@napi-rs/canvas")));
    assert.equal(t.ai.requests.length, 0);
    assert.equal(t.files.present, false);
  });

  it("AI disabled in admin config: FAILED with a clean message, no calls", async () => {
    const t = setup({ kinds: ["text"], respond: defaultResponder() });
    t.deps.client = async () => null;
    assert.equal(await createMaterialJob(t.deps)(1), "FAILED");
    assert.equal(t.mem.upload.error, MATERIAL_MESSAGES.aiOff);
    assert.equal(t.files.present, false);
  });

  it("resumes after a restart without redoing stored work", async () => {
    // Lần 1: hình được mô tả rồi hết token ngay trước bước gán chương
    const kinds: PageKind[] = ["figure", "text", "text"];
    const t = setup({ kinds, limit: 30_000, respond: (req) => (kindOf(req) === "figure" ? { text: figureJson("high"), input: 24_000, output: 1000 } : defaultResponder()(req)) });
    assert.equal(await t.run(1), "FAILED");
    assert.deepEqual(t.ai.requests.map(kindOf), ["figure"]);
    assert.notEqual(t.mem.pages.get(1)!.figure, null);

    // Lần 2 (vd khởi động lại, tệp tạm vẫn còn, cửa sổ đã trôi qua): không tách lại trang, không mô tả lại hình đã có
    t.files.present = true;
    t.usage.length = 0;
    t.ai.requests.length = 0;
    const savePagesBefore = t.mem.calls.savePages;
    assert.equal(await t.run(1), "DONE");
    assert.equal(t.mem.calls.savePages, savePagesBefore);
    assert.deepEqual(t.ai.requests.map(kindOf), ["assign", "chapter", "chapter"]); // hình đã có: không gọi lại
    assert.equal(t.mem.upload.status, "DONE");
  });

  it("stops quietly when the upload is deleted while running", async () => {
    let t: ReturnType<typeof setup>;
    t = setup({
      kinds: ["figure", "text", "text"],
      respond: (req) => {
        t.mem.remove(); // người dùng xoá ngay sau lần gọi đầu
        return defaultResponder()(req);
      },
    });
    assert.equal(await t.run(1), "CANCELLED");
    assert.equal(t.ai.requests.length, 1);
    assert.equal(t.files.present, false);
  });

  it("unparsable figure output from both models: the page is kept as text, the job still finishes", async () => {
    const t = setup({ kinds: ["figure", "text"], respond: defaultResponder(() => '{"figure_type": "diag') });
    assert.equal(await t.run(1), "DONE");
    assert.equal(t.mem.pages.get(1)!.kind, "text");
    assert.equal(t.mem.pages.get(1)!.figure, null);
  });
});
