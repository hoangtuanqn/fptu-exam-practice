import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_MARKETING_PARAMS, PARAM_LIMITS } from "../src/constants/marketing";
import { campaignKeyParam, marketingParamsSchema, previewQuery, setParamsBody, unsubscribeBody } from "../src/rules/requests/marketing.request";
import { updateProfileBody } from "../src/rules/requests/user.request";

// Trần cứng của tham số marketing và các body mới (không cần DB)

describe("marketing params limits", () => {
  it("accepts the defaults", () => {
    assert.equal(marketingParamsSchema.safeParse(DEFAULT_MARKETING_PARAMS).success, true);
  });

  it("rejects values past the hard ceilings", () => {
    assert.equal(PARAM_LIMITS.dailyCap.max, 300);
    assert.equal(PARAM_LIMITS.minGapDays.min, 3);
    for (const bad of [{ dailyCap: 99999 }, { dailyCap: 0 }, { dailyCap: 1.5 }, { minGapDays: 0 }, { minGapDays: 2 }, { upsellRepeatDays: 1000 }, { expiryStepDays: [31, 1] }]) {
      assert.equal(setParamsBody.safeParse(bad).success, false, JSON.stringify(bad));
    }
    assert.equal(setParamsBody.safeParse({ dailyCap: 300, minGapDays: 3 }).success, true);
  });

  it("requires strictly increasing win-back steps within range and a max inactive past the last step", () => {
    assert.equal(setParamsBody.safeParse({ winbackStepDays: [14, 14, 60] }).success, false);
    assert.equal(setParamsBody.safeParse({ winbackStepDays: [30, 14, 60] }).success, false);
    assert.equal(setParamsBody.safeParse({ winbackStepDays: [6, 14, 60] }).success, false);
    assert.equal(setParamsBody.safeParse({ winbackStepDays: [14, 30, 366] }).success, false);
    assert.equal(setParamsBody.safeParse({ winbackStepDays: [7, 20, 90] }).success, true);
    assert.equal(marketingParamsSchema.safeParse({ ...DEFAULT_MARKETING_PARAMS, winbackMaxInactiveDays: 60 }).success, false);
    assert.equal(setParamsBody.safeParse({ expiryStepDays: [1, 7] }).success, false); // bước 1 phải xa hơn bước 2
  });
});

describe("marketing request bodies", () => {
  it("unsubscribe keeps the old body and needs a topic for mode topic", () => {
    assert.deepEqual(unsubscribeBody.parse({ token: "t" }), { token: "t" });
    assert.equal(unsubscribeBody.parse(undefined), undefined);
    assert.equal(unsubscribeBody.safeParse({ token: "t", mode: "topic" }).success, false);
    assert.equal(unsubscribeBody.safeParse({ token: "t", mode: "topic", topic: "spam" }).success, false);
    assert.equal(unsubscribeBody.safeParse({ token: "t", mode: "topic", topic: "offers" }).success, true);
    assert.equal(unsubscribeBody.safeParse({ token: "t", mode: "pause" }).success, true);
  });

  it("profile accepts topic mask 0..15 and pause 0 or 30 days", () => {
    assert.equal(updateProfileBody.safeParse({ marketingMutedTopics: 15 }).success, true);
    assert.equal(updateProfileBody.safeParse({ marketingMutedTopics: 16 }).success, false);
    assert.equal(updateProfileBody.safeParse({ marketingMutedTopics: -1 }).success, false);
    assert.equal(updateProfileBody.safeParse({ pauseMarketingDays: 30 }).success, true);
    assert.equal(updateProfileBody.safeParse({ pauseMarketingDays: 0 }).success, true);
    assert.equal(updateProfileBody.safeParse({ pauseMarketingDays: 7 }).success, false);
    assert.equal(updateProfileBody.safeParse({}).success, false);
  });

  it("preview needs a known campaign and a positive step", () => {
    assert.equal(campaignKeyParam.safeParse({ key: "nope" }).success, false);
    assert.equal(previewQuery.parse({}).step, 1);
    assert.equal(previewQuery.parse({ step: "2" }).step, 2);
    assert.equal(previewQuery.safeParse({ step: "0" }).success, false);
  });
});
