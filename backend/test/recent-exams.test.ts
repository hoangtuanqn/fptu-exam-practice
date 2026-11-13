import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickExams, type ExamLite } from "../src/utils/recent-exams";

const NOW = new Date("2026-11-13T05:00:00Z");
const exam = (threadId: string, term: string | null, status: ExamLite["status"], extra: Partial<ExamLite> = {}): ExamLite => ({ threadId, title: `PRO192 ${term ?? "Practice"} FE`, postedAt: null, term, status, questions: null, ...extra });
const ITEMS: ExamLite[] = [exam("4", "FA26", "ready", { questions: 50, postedAt: new Date("2026-10-20T00:00:00Z") }), exam("3", "SU26", "fetch"), exam("2", "SP25", "owned"), exam("1", null, "fetch")];
const base = { code: "PRO192", recent: true, limit: 10, offset: 0, now: NOW };

describe("pickExams", () => {
  it("keeps only the current and previous semester, in the given order", () => {
    const r = pickExams(ITEMS, base);
    assert.deepEqual(r.rows.map((x) => x[1]), ["FA26", "SU26"]);
    assert.equal(r.matched, 2);
    assert.equal(r.note, undefined);
  });
  it("never counts an exam without a term as recent, but lists it when asked for all", () => {
    assert.ok(!pickExams(ITEMS, base).rows.some((x) => x[1] === null));
    assert.ok(pickExams(ITEMS, { ...base, recent: false }).rows.some((x) => x[1] === null));
  });
  it("falls back to the newest exams with a note when nothing is recent", () => {
    const r = pickExams([exam("2", "SP25", "owned"), exam("1", "FA24", "fetch")], { ...base, limit: 1 });
    assert.equal(r.note, "no_recent_exams");
    assert.deepEqual(r.rows.map((x) => x[1]), ["SP25"]);
  });
  it("filters by term case-insensitively and ignores the recent flag", () => {
    const r = pickExams(ITEMS, { ...base, term: "sp25" });
    assert.deepEqual(r.rows.map((x) => x[1]), ["SP25"]);
    assert.equal(r.note, undefined);
  });
  it("pages with offset and limit while matched stays the total", () => {
    const r = pickExams(ITEMS, { ...base, limit: 1, offset: 1 });
    assert.deepEqual(r.rows.map((x) => x[1]), ["SU26"]);
    assert.equal(r.matched, 2);
  });
  it("links ready and owned exams to FEPass and others to the subject catalog", () => {
    const links = Object.fromEntries(pickExams(ITEMS, { ...base, recent: false }).rows.map((x) => [x[2] + x[1], x[5]]));
    assert.equal(links["readyFA26"], "/exam/4");
    assert.equal(links["ownedSP25"], "/exam/2");
    assert.equal(links["fetchSU26"], "/account/exams?tab=subject&subject=PRO192");
  });
  it("formats the posted date as YYYY-MM-DD or null", () => {
    const [first, second] = pickExams(ITEMS, base).rows;
    assert.equal(first![4], "2026-10-20");
    assert.equal(second![4], null);
  });
});
