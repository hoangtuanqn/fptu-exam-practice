import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ageDays, confidenceOf, recencyScore, recencyWeight } from "../src/utils/frequency-stats";

const d = (s: string) => new Date(`${s}T00:00:00Z`);

describe("frequency stats math (pure)", () => {
  it("recency weight halves every half-life and is 1 for the newest exam", () => {
    assert.equal(recencyWeight(0, 730), 1);
    assert.equal(recencyWeight(730, 730), 0.5);
    assert.equal(recencyWeight(1460, 730), 0.25);
    assert.equal(recencyWeight(-5, 730), 1); // future dates count as newest
  });

  it("age is measured from the newest exam", () => {
    assert.equal(ageDays(d("2023-01-01"), d("2024-01-01")), 365);
  });

  it("a recent exam weighs more than an old one with the same count", () => {
    const dates = [d("2020-01-01"), d("2021-01-01"), d("2022-01-01"), d("2023-01-01"), d("2024-01-01")];
    const old = recencyScore(dates, [0, 1]);
    const recent = recencyScore(dates, [3, 4]);
    assert.ok(recent > old, `${recent} <= ${old}`);
    assert.equal(recencyScore(dates, [0, 1, 2, 3, 4]), 1);
    assert.equal(recencyScore(dates, []), 0);
    assert.equal(recencyScore([], []), 0);
  });

  it("confidence comes from the number of exams", () => {
    assert.equal(confidenceOf(0), "low");
    assert.equal(confidenceOf(4), "low");
    assert.equal(confidenceOf(5), "medium");
    assert.equal(confidenceOf(15), "high");
    assert.equal(confidenceOf(3, 2, 3), "high");
  });
});

describe("CLI argument guards", () => {
  it("rejects a half-life <= 0 and a threshold outside (0, 1]", async () => {
    const { assertHalfLife } = await import("../src/utils/frequency-stats");
    const { assertThreshold } = await import("../src/utils/question-clustering");
    assert.equal(assertHalfLife(730), 730);
    for (const bad of [0, -1, Number.NaN]) assert.throws(() => assertHalfLife(bad), /Half-life must be > 0/);
    assert.equal(assertThreshold(1), 1);
    assert.equal(assertThreshold(0.99), 0.99);
    for (const bad of [0, -0.5, 1.01, Number.NaN]) assert.throws(() => assertThreshold(bad), /Threshold must be in \(0, 1\]/);
  });
});
