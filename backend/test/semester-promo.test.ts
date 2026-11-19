import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PRO_PLAN } from "../src/constants/plan";
import { nextSemesterStartedAt, PROMO_DEFAULTS, proPriceFor, semesterPromoActive } from "../src/constants/promo";

const now = Date.parse("2026-12-01T00:00:00Z");
const on = { ...PROMO_DEFAULTS, semesterPromoEnabled: true, semesterPromoTerm: "SP27", semesterPromoPrice: 69_000, semesterPromoEndsAt: "2027-01-15T00:00:00Z", semesterPromoStartedAt: "2026-11-20T00:00:00Z" };

describe("semesterPromoActive", () => {
  it("is active only when enabled, with a term and a future end", () => {
    assert.equal(semesterPromoActive(on, now), true);
    assert.equal(semesterPromoActive({ ...on, semesterPromoEnabled: false }, now), false);
    assert.equal(semesterPromoActive({ ...on, semesterPromoTerm: "" }, now), false);
    assert.equal(semesterPromoActive({ ...on, semesterPromoEndsAt: "" }, now), false);
    assert.equal(semesterPromoActive({ ...on, semesterPromoEndsAt: "not a date" }, now), false);
  });
  it("expires by itself after the end", () => {
    assert.equal(semesterPromoActive(on, Date.parse("2027-01-15T00:00:01Z")), false);
  });
  it("ignores a price that is not below the regular price", () => {
    assert.equal(semesterPromoActive({ ...on, semesterPromoPrice: PRO_PLAN.price }, now), false);
  });
});

describe("proPriceFor", () => {
  it("gives the promo price once per campaign", () => {
    assert.equal(proPriceFor(on, false, now), 69_000);
    assert.equal(proPriceFor(on, true, now), PRO_PLAN.price);
    assert.equal(proPriceFor({ ...on, semesterPromoEnabled: false }, false, now), PRO_PLAN.price);
  });
});

describe("nextSemesterStartedAt", () => {
  const at = new Date("2026-12-02T00:00:00Z");
  it("starts a new campaign when switched on or when the term changes", () => {
    assert.equal(nextSemesterStartedAt({ ...on, semesterPromoEnabled: false }, true, "SP27", at), at.toISOString());
    assert.equal(nextSemesterStartedAt(on, true, "SU27", at), at.toISOString());
  });
  it("keeps the campaign when nothing relevant changes or it is switched off", () => {
    assert.equal(nextSemesterStartedAt(on, true, "SP27", at), on.semesterPromoStartedAt);
    assert.equal(nextSemesterStartedAt(on, false, "SP27", at), on.semesterPromoStartedAt);
  });
});
