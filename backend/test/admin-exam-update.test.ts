import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { updateExamBody } from "../src/rules/requests/admin.request";
import { createThrowawayDb, DB_SKIP_REASON, DB_TESTS_ENABLED, type ThrowawayDb } from "./helpers/test-db";

// PATCH /admin/exams/:id: sửa tên, loại, môn của đề

describe("updateExamBody", () => {
  it("keeps old title-only clients working", () => {
    assert.deepEqual(updateExamBody.parse({ title: "  PRO192 SU26 FE " }), { title: "PRO192 SU26 FE" });
  });
  it("accepts kind only, uppercases subjectCode and allows null", () => {
    assert.deepEqual(updateExamBody.parse({ kind: "PE" }), { kind: "PE" });
    assert.equal(updateExamBody.parse({ subjectCode: " pro192 " }).subjectCode, "PRO192");
    assert.equal(updateExamBody.parse({ subjectCode: null }).subjectCode, null);
  });
  it("rejects an empty body and bad values", () => {
    assert.equal(updateExamBody.safeParse({}).success, false);
    assert.equal(updateExamBody.safeParse({ title: "   " }).success, false);
    assert.equal(updateExamBody.safeParse({ kind: "XX" }).success, false);
    assert.equal(updateExamBody.safeParse({ subjectCode: "not a code" }).success, false);
  });
});

const load = async () => ({
  prisma: (await import("../src/configs/prisma")).prisma,
  service: (await import("../src/services/admin.exam.service")).adminExamService,
});
const hasStatus = (status: number) => (error: unknown) => (error as { status?: number }).status === status;

describe("admin exam update (throwaway MySQL)", { skip: DB_TESTS_ENABLED ? false : DB_SKIP_REASON }, () => {
  let db: ThrowawayDb;
  let m: Awaited<ReturnType<typeof load>>;
  let examId: string;

  before(async () => {
    db = await createThrowawayDb();
    m = await load();
    await m.prisma.subject.create({ data: { code: "TST101", name: "Test" } });
    examId = (await m.prisma.exam.create({ data: { threadId: "u1", title: "OLD101 x", subjectCode: "OLD101", kind: "FE", sourceUrl: "https://example.invalid", totalQuestions: 0, answerSource: "AI" } })).id;
  });
  after(async () => {
    await m?.prisma.$disconnect();
    await db?.drop();
  });

  it("title only: renames and derives subjectCode from the title as before", async () => {
    const d = await m.service.update("a", examId, { title: "PRO192 SU26 FE" });
    assert.equal(d.title, "PRO192 SU26 FE");
    assert.equal(d.subjectCode, "PRO192");
    assert.equal(d.kind, "FE");
  });

  it("kind only: leaves title and subject alone", async () => {
    const d = await m.service.update("a", examId, { kind: "PE" });
    assert.deepEqual([d.title, d.subjectCode, d.kind], ["PRO192 SU26 FE", "PRO192", "PE"]);
  });

  it("subjectCode wins over the title, null clears it", async () => {
    let d = await m.service.update("a", examId, { title: "Some title", subjectCode: "TST101" });
    assert.deepEqual([d.title, d.subjectCode], ["Some title", "TST101"]);
    d = await m.service.update("a", examId, { subjectCode: null });
    assert.equal(d.subjectCode, null);
  });

  it("rename with the exam's own legacy subjectCode that is not in subjects succeeds and keeps it", async () => {
    const legacy = (await m.prisma.exam.create({ data: { threadId: "u2", title: "LEG101 x", subjectCode: "LEG101", kind: "FE", sourceUrl: "https://example.invalid", totalQuestions: 0, answerSource: "AI" } })).id;
    const d = await m.service.update("a", legacy, { title: "Renamed", subjectCode: "LEG101" });
    assert.deepEqual([d.title, d.subjectCode], ["Renamed", "LEG101"]);
  });

  it("unknown subject -> 400 with a subjectCode field error, missing exam -> 404", async () => {
    await assert.rejects(m.service.update("a", examId, { subjectCode: "ZZZ999" }), (e: unknown) => hasStatus(400)(e) && "subjectCode" in ((e as { errors?: object }).errors ?? {}));
    await assert.rejects(m.service.update("a", "0190a000-0000-7000-8000-000000000000", { kind: "FE" }), hasStatus(404));
  });
});
