import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { explainFeedbackBody } from "../src/rules/requests/explanation.request";

const EXAM_ID = "0190f5c2-7a10-7000-8000-000000000001";
const ok = (b: object) => explainFeedbackBody.safeParse({ examId: EXAM_ID, questionNumber: 2, ...b }).success;

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

  it("takes the exam id as a UUID string only (old numeric ids are rejected), lower-cased", () => {
    assert.equal(ok({ helpful: true, examId: 7167 }), false);
    assert.equal(ok({ helpful: true, examId: "7167" }), false);
    const r = explainFeedbackBody.safeParse({ examId: EXAM_ID.toUpperCase(), questionNumber: 2, helpful: true });
    assert.equal(r.success && r.data.examId, EXAM_ID);
  });
});
