import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { termOf, termRank } from "../src/utils/term";

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
