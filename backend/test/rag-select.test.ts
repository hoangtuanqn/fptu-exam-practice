import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { effectiveKinds, pickMultiHits } from "../src/utils/rag-select";
import { analyze } from "../src/services/syllabus-rag.service";

const hit = (subject: string, kind: string, p: number, len = 100) => ({ slug: `${subject}:${kind}:1`, subject, p, content: "x".repeat(len) });
const OPTS = { include: 0.15, minPer: 2, maxPer: 4, maxChars: 14000 };

describe("analyze groups", () => {
  it("groups the subjects by the code the user typed, in the order typed", () => {
    const a = analyze("CSI106 tính điểm, mad101 giáo trình, và PRO192 chương nào", ["CSI106", "MAD101", "PRO192", "PRO192C"]);
    assert.deepEqual(a.groups, [["CSI106"], ["MAD101"], ["PRO192", "PRO192C"]]);
    assert.deepEqual(a.subjects.sort(), ["CSI106", "MAD101", "PRO192", "PRO192C"]);
  });
  it("does not repeat a code mentioned twice", () => {
    assert.deepEqual(analyze("CSI106 điểm và CSI106 chương", ["CSI106"]).groups, [["CSI106"]]);
  });
});

describe("pickMultiHits", () => {
  // Thứ tự xếp hạng thật từ lần đo: một lần tìm chung bị chương của vài môn chiếm hết 5 chỗ
  const list = [hit("CSI106", "chapters", 0.43), hit("MAD101", "chapters", 0.39), hit("MAD101", "assessment", 0.39), hit("PRO192C", "assessment", 0.35), hit("PRO192C", "chapters", 0.35), hit("CSI106", "assessment", 0.3), hit("MAD101", "materials", 0.25), hit("CSI106", "materials", 0.05)];
  const groups = [["CSI106"], ["MAD101"], ["PRO192", "PRO192C"]];

  it("gives every typed code its own share, so the part asked about is not crowded out", () => {
    const slugs = pickMultiHits(list, groups, OPTS).map((h) => h.slug);
    assert.ok(slugs.includes("CSI106:assessment:1"));
    assert.ok(slugs.includes("MAD101:materials:1"));
    assert.ok(slugs.includes("PRO192C:chapters:1"));
  });
  it("lists the codes in the order the user typed them", () => {
    const subjects = pickMultiHits(list, groups, OPTS).map((h) => h.subject);
    assert.deepEqual([...new Set(subjects)], ["CSI106", "MAD101", "PRO192C"]);
  });
  it("keeps at most maxPer chunks per code and drops chunks below the threshold past minPer", () => {
    const out = pickMultiHits(list, groups, { ...OPTS, maxPer: 2 });
    assert.equal(out.filter((h) => h.subject === "MAD101").length, 2);
    assert.ok(!pickMultiHits(list, groups, OPTS).some((h) => h.slug === "CSI106:materials:1"));
  });
  it("still returns the best chunk of every code when the character budget is tiny", () => {
    const out = pickMultiHits([hit("A1", "x", 0.5, 5000), hit("B2", "x", 0.4, 5000), hit("C3", "x", 0.3, 5000)], [["A1"], ["B2"], ["C3"]], { ...OPTS, maxChars: 1000 });
    assert.deepEqual(out.map((h) => h.subject), ["A1", "B2", "C3"]);
  });
  it("never lets the extras of earlier codes eat the guaranteed share of later codes", () => {
    const big = [hit("A1", "a", 0.9, 4000), hit("A1", "b", 0.8, 4000), hit("A1", "c", 0.7, 4000), hit("A1", "d", 0.6, 4000), hit("B2", "a", 0.5, 4000), hit("B2", "b", 0.4, 4000)];
    const out = pickMultiHits(big, [["A1"], ["B2"]], OPTS);
    assert.equal(out.filter((h) => h.subject === "B2").length, 2);
  });
  it("gives the guaranteed share to chunks of the kinds asked for before higher scoring chunks of other kinds", () => {
    const k = (kind: string, p: number, kindMatch: boolean) => ({ ...hit("CSI106", kind, p), kindMatch });
    const out = pickMultiHits([k("overview", 0.6, true), k("cq", 0.38, false), k("assessment", 0.3, true), k("chapters", 0.29, true)], [["CSI106"]], { ...OPTS, maxPer: 2 });
    assert.deepEqual(out.map((h) => h.slug), ["CSI106:overview:1", "CSI106:assessment:1"]);
  });
  it("lets different parts of a code win before a second variant of the same part", () => {
    const k = (subject: string, kind: string, p: number) => ({ ...hit(subject, kind, p), kind, kindMatch: true });
    // PRO192 và PRO192C đều có tổng quan và đánh giá: bản biến thể không được chiếm hết chỗ của phần chương
    const list = [k("PRO192C", "overview", 0.64), k("PRO192", "overview", 0.63), k("PRO192", "assessment", 0.62), k("PRO192C", "assessment", 0.61), k("PRO192", "chapters", 0.3)];
    const out = pickMultiHits(list, [["PRO192", "PRO192C"]], { ...OPTS, maxPer: 3 });
    assert.deepEqual(out.map((h) => h.slug), ["PRO192C:overview:1", "PRO192:assessment:1", "PRO192:chapters:1"]);
  });
  it("skips a code that has no chunks", () => {
    assert.deepEqual(pickMultiHits(list, [["ZZZ999"], ["MAD101"]], OPTS).map((h) => h.subject), ["MAD101", "MAD101", "MAD101"]);
  });
});

describe("effectiveKinds", () => {
  const DEFAULTS = ["overview", "assessment", "chapters"] as const;
  it("falls back to the broad kinds when the question names no particular part", () => {
    assert.deepEqual([...effectiveKinds(new Set<string>(), DEFAULTS)].sort(), ["assessment", "chapters", "overview"]);
  });
  it("keeps the kinds the question asked for", () => {
    assert.deepEqual([...effectiveKinds(new Set(["materials"]), DEFAULTS)], ["materials"]);
  });
});
