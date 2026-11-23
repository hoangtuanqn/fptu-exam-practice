import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BADGE_KEY_MAX, BADGE_PIN_MAX, BADGES } from "../src/constants/badges";
import { USER_NOTICE_TITLE_MAX } from "../src/constants/user-notice";
import { setBadgePinsBody } from "../src/rules/requests/badge.request";
import { pinError, progressOf, raisedTier, tierFor } from "../src/utils/badges";

const def = (key: string) => BADGES.find((b) => b.key === key)!;

describe("badge catalog", () => {
  it("keys are unique and fit the column; tiers ascend from level 1", () => {
    assert.equal(new Set(BADGES.map((b) => b.key)).size, BADGES.length);
    for (const b of BADGES) {
      assert.ok(b.key.length <= BADGE_KEY_MAX, b.key);
      b.tiers.forEach((t, i) => {
        assert.equal(t.level, i + 1, b.key);
        if (i > 0) assert.ok(t.threshold > b.tiers[i - 1]!.threshold, b.key);
      });
      // tiêu đề thông báo dài nhất phải vừa cột
      assert.ok(`Bạn nhận được huy hiệu "${b.name}" (${b.tiers.at(-1)!.label})`.length <= USER_NOTICE_TITLE_MAX);
    }
  });
});

describe("tierFor (threshold edges)", () => {
  const runner = def("exam_runner"); // 5 / 25 / 100
  it("below the first threshold is 0", () => {
    assert.equal(tierFor(runner, 0), 0);
    assert.equal(tierFor(runner, 4), 0);
  });
  it("exactly at a threshold reaches that tier", () => {
    assert.equal(tierFor(runner, 5), 1);
    assert.equal(tierFor(runner, 25), 2);
    assert.equal(tierFor(runner, 100), 3);
  });
  it("between and over thresholds", () => {
    assert.equal(tierFor(runner, 24), 1);
    assert.equal(tierFor(runner, 26), 2);
    assert.equal(tierFor(runner, 10_000), 3);
  });
  it("single-tier badges", () => {
    assert.equal(tierFor(def("welcome"), 0), 0);
    assert.equal(tierFor(def("welcome"), 1), 1);
    assert.equal(tierFor(def("pro_loyal"), 179), 0);
    assert.equal(tierFor(def("pro_loyal"), 180), 1);
  });
});

describe("raisedTier (never downgrade)", () => {
  it("writes only when the computed tier is higher", () => {
    assert.equal(raisedTier(0, 1), 1);
    assert.equal(raisedTier(1, 3), 3);
    assert.equal(raisedTier(2, 2), null);
    assert.equal(raisedTier(3, 1), null); // counters dropped (e.g. data deleted): keep tier 3
    assert.equal(raisedTier(2, 0), null);
  });
});

describe("progressOf", () => {
  const runner = def("exam_runner");
  it("next is the threshold of the tier above the stored tier", () => {
    assert.deepEqual(progressOf(runner, 0, 3), { current: 3, next: 5 });
    assert.deepEqual(progressOf(runner, 1, 7), { current: 7, next: 25 });
    assert.deepEqual(progressOf(runner, 3, 140), { current: 140, next: null });
  });
});

describe("pin validation", () => {
  const earned = new Set(["welcome", "first_exam", "streak", "exam_runner"]);
  it("accepts up to the max of earned badges, and an empty list", () => {
    assert.equal(pinError([], earned), null);
    assert.equal(pinError(["welcome", "streak", "exam_runner"], earned), null);
  });
  it("rejects more than the max", () => {
    assert.equal(BADGE_PIN_MAX, 3);
    assert.match(pinError(["welcome", "first_exam", "streak", "exam_runner"], earned)!, /tối đa 3/);
  });
  it("rejects unearned or unknown badges", () => {
    assert.match(pinError(["welcome", "perfect_ten"], earned)!, /đã đạt/);
    assert.match(pinError(["nope"], earned)!, /đã đạt/);
  });
  it("rejects duplicates", () => {
    assert.match(pinError(["welcome", "welcome"], earned)!, /trùng/);
  });
  it("request body: array of short strings, at most the max", () => {
    assert.ok(setBadgePinsBody.safeParse({ keys: ["welcome"] }).success);
    assert.ok(!setBadgePinsBody.safeParse({ keys: ["a", "b", "c", "d"] }).success);
    assert.ok(!setBadgePinsBody.safeParse({ keys: "welcome" }).success);
    assert.ok(!setBadgePinsBody.safeParse({ keys: ["x".repeat(BADGE_KEY_MAX + 1)] }).success);
  });
});
