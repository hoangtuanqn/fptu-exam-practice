import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { catalogOrder } from "../src/utils/catalog-order";

const item = (threadId: string, term: string | null, postedAt: string | null = null) => ({ threadId, term, postedAt: postedAt ? new Date(postedAt) : null });
const ids = (list: { threadId: string }[]) => list.map((i) => i.threadId);

function permutations<T>(xs: T[]): T[][] {
  if (xs.length <= 1) return [xs];
  return xs.flatMap((x, i) => permutations([...xs.slice(0, i), ...xs.slice(i + 1)]).map((rest) => [x, ...rest]));
}

describe("catalogOrder", () => {
  it("puts newer terms first and exams without a term last", () => {
    const list = [item("100", "SU26"), item("99999999999999999", "SU25"), item("5", "FA26"), item("m000000000000", null)];
    assert.deepEqual(ids(list.sort(catalogOrder)), ["5", "100", "99999999999999999", "m000000000000"]);
  });
  it("within a term: newer date, then longer id, then larger id; never throws on manual ids", () => {
    const list = [item("7094", "FA26"), item("m3fa09c0a1b2c", "FA26"), item("12000", "FA26"), item("9", "FA26", "2026-10-01")];
    assert.deepEqual(ids(list.sort(catalogOrder)), ["9", "m3fa09c0a1b2c", "12000", "7094"]);
  });
  it("gives the same output for every input order of a mixed list", () => {
    const mixed = [
      item("7094", "FA26", "2026-09-15"),
      item("12000", "FA26"),
      item("m3fa09c0a1b2c", "FA26"),
      item("mffffffffffff", null),
      item("99", null, "2025-01-01"),
      item("100", "SU25"),
      item("m000000000000", "SU25", "2025-06-01"),
    ];
    const expected = ids([...mixed].sort(catalogOrder));
    for (const p of permutations(mixed)) assert.deepEqual(ids([...p].sort(catalogOrder)), expected);
  });
});
