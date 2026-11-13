import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { explainFeedbackBody } from "../src/rules/requests/explanation.request";

const ok = (b: object) => explainFeedbackBody.safeParse({ examId: 1, questionNumber: 2, ...b }).success;

describe("explainFeedbackBody", () => {
  it("accepts a thumbs up and a thumbs down with a reason and comment", () => {
    assert.equal(ok({ helpful: true }), true);
    assert.equal(ok({ helpful: false, reason: "WRONG_SUBJECT", comment: "Nói về Java" }), true);
  });

  it("rejects an unknown reason, a long comment, a missing vote and extra keys", () => {
    assert.equal(ok({ helpful: false, reason: "BAD" }), false);
    assert.equal(ok({ helpful: false, comment: "a".repeat(501) }), false);
    assert.equal(ok({}), false);
    assert.equal(ok({ helpful: true, userId: 9 }), false);
  });
});
