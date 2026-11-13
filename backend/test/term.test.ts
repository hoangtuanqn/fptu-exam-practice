import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isRecentTerm, termIndex, termOf, termRank } from "../src/utils/term";

describe("termOf", () => {
  it("reads short and 4-digit years", () => {
    assert.equal(termOf("PRO192 FA24 Practical"), "FA24");
    assert.equal(termOf("PRO192 FA 2024 Practical"), "FA24");
    assert.equal(termOf("PRO192 su-2025"), "SU25");
    assert.equal(termOf("PRO192 SP20"), "SP20");
  });
  it("reads full season names", () => {
    assert.equal(termOf("Đề Fall 2024"), "FA24");
    assert.equal(termOf("Summer2025 FE"), "SU25");
    assert.equal(termOf("Spring-26"), "SP26");
  });
  it("ignores titles without a term or with a longer number", () => {
    assert.equal(termOf("PRO192 FE mới nhất"), null);
    assert.equal(termOf("PRO192 FA 20245"), null);
    assert.equal(termOf("XFA24"), null);
  });
  it("ranks later terms first", () => {
    assert.ok(termRank("FA24") > termRank("SU24"));
    assert.ok(termRank("SU24") > termRank("SP24"));
    assert.ok(termRank("SP25") > termRank("FA24"));
  });
});

describe("isRecentTerm", () => {
  it("counts the current and the previous semester", () => {
    const nov = new Date("2026-11-13T05:00:00Z");
    assert.equal(isRecentTerm("FA26", nov), true);
    assert.equal(isRecentTerm("SU26", nov), true);
    assert.equal(isRecentTerm("SP26", nov), false);
    assert.equal(isRecentTerm("FA25", nov), false);
    assert.equal(isRecentTerm(null, nov), false);
  });
  it("rolls over the new year", () => {
    const jan = new Date("2027-01-10T05:00:00Z");
    assert.equal(isRecentTerm("FA26", jan), true);
    assert.equal(isRecentTerm("SU26", jan), false);
    assert.equal(isRecentTerm("SP27", jan), true);
  });
  it("uses Vietnam time at the semester boundary", () => {
    assert.equal(isRecentTerm("SP26", new Date("2026-08-31T10:00:00Z")), true); // 31/08 17:00 ở Việt Nam: còn kỳ SU
    assert.equal(isRecentTerm("SP26", new Date("2026-08-31T20:00:00Z")), false); // đã sang 01/09: kỳ FA
  });
  it("orders terms and rejects junk", () => {
    assert.ok(termIndex("FA24")! > termIndex("SU24")!);
    assert.equal(termIndex("xx"), null);
  });
});
