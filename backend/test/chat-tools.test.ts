import assert from "node:assert/strict";
import { describe, it, mock } from "node:test";
import { prisma } from "../src/configs/prisma";
import { catalogService } from "../src/services/catalog.service";
import { chatToolsFor, runChatTool, toolStatus } from "../src/services/chat-tools.service";
import { normalizeSubjectCode } from "../src/utils/subject-code";

describe("normalizeSubjectCode", () => {
  it("reads the same subject however it is typed", () => {
    for (const raw of ["pro 192", "pro-192", "Pro192", " PRO_192 "]) assert.equal(normalizeSubjectCode(raw), "PRO192");
  });
  it("rejects junk", () => {
    assert.equal(normalizeSubjectCode("!!"), null);
    assert.equal(normalizeSubjectCode(""), null);
  });
});

describe("chat tools", () => {
  it("gives guests only recent_exams and members their data too", () => {
    assert.deepEqual(chatToolsFor(null).map((t) => t.name), ["recent_exams"]);
    assert.deepEqual(chatToolsFor(7).map((t) => t.name), ["get_my_data", "recent_exams"]);
  });
  it("answers an invalid subject with an error before touching the database", async () => {
    const out = JSON.parse(await runChatTool(null, "recent_exams", { subject: "!!" }));
    assert.ok(typeof out.error === "string" && out.error.length > 0);
  });
  it("no longer offers the live FuOverflow tool", async () => {
    const out = JSON.parse(await runChatTool(null, "find_fuo_exams", { subject: "PRO192" }));
    assert.ok(out.error);
  });
  it("tells the user which subject is being looked up", () => {
    assert.ok(toolStatus("recent_exams", { subject: "PRO192" }).includes("PRO192"));
  });
});

describe("recent_exams window", () => {
  it("finds an old semester even when the subject has more than 50 exams", async () => {
    // Giả lập đúng cách catalogService.exams hoạt động: xếp mới nhất trước rồi mới cắt theo limit
    const all = Array.from({ length: 80 }, (_, i) => ({ threadId: String(1000 - i), title: `PRO192 ${i < 70 ? "FA26" : "FA23"} FE ${i}`, postedAt: null, replies: 0, term: i < 70 ? "FA26" : "FA23", status: "fetch" as const, questions: null }));
    const exams = mock.method(catalogService, "exams", async (_code: string, q: { page: number; limit: number }) => ({ items: all.slice(0, q.limit), meta: { page: 1, limit: q.limit, total: all.length, totalPages: 1 }, terms: [], total: all.length, price: 500, subject: { code: "PRO192", name: null, semester: null } }));
    const original = Object.getOwnPropertyDescriptor(prisma, "fuoThread");
    Object.defineProperty(prisma, "fuoThread", { value: { aggregate: async () => ({ _max: { syncedAt: null } }) }, configurable: true });
    try {
      const out = JSON.parse(await runChatTool(null, "recent_exams", { subject: "PRO192", recent: false, term: "FA23" }));
      assert.equal(out.matched, 10);
      assert.equal(out.items.length, 6);
    } finally {
      exams.mock.restore();
      if (original) Object.defineProperty(prisma, "fuoThread", original);
      else delete (prisma as unknown as Record<string, unknown>).fuoThread;
    }
  });
});
