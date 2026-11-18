import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { subjectIdParam } from "../src/rules/requests/frequency-stats.request";
import { splitHashBudget } from "../src/utils/similarity-job";

// Subject, deposit and wallet-row ids are UUID v7 strings since migration 0081.
const SUBJECT = "0190f5a2-1c3b-7000-8003-0123456789ab";

describe("subject id param (/subjects/:id/chapter-stats, /subjects/:id/hot-questions)", () => {
  it("accepts a UUID (lower-cased like the stored value) and rejects the old numeric id", () => {
    assert.deepEqual(subjectIdParam.parse({ id: SUBJECT.toUpperCase() }), { id: SUBJECT });
    assert.equal(subjectIdParam.safeParse({ id: "12" }).success, false);
    assert.equal(subjectIdParam.safeParse({ id: 12 }).success, false);
    assert.equal(subjectIdParam.safeParse({ id: "PRO192" }).success, false);
  });
});

describe("hash budget with string subject ids", () => {
  it("breaks ties by id deterministically, whatever the input order", () => {
    const a = { id: "0190a000-0000-7000-8000-000000000002", missing: 5 };
    const b = { id: "0190a000-0000-7000-8000-000000000001", missing: 5 };
    // 3 images for two equal subjects: the split depends only on the ids, not on the input order
    const one = splitHashBudget([a, b], 3);
    const two = splitHashBudget([b, a], 3);
    assert.equal(one.get(a.id)! + one.get(b.id)!, 3);
    assert.equal(one.get(a.id), two.get(a.id));
    assert.equal(one.get(b.id), two.get(b.id));
    assert.notEqual(one.get(a.id), one.get(b.id));
  });
});
