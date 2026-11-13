import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { epochDay, signMarketingToken, verifyMarketingToken } from "../src/utils/marketing-token";

const SECRET = "x".repeat(32);

describe("marketing unsubscribe token", () => {
  it("round-trips the user id", () => {
    assert.equal(verifyMarketingToken(SECRET, signMarketingToken(SECRET, 42)), 42);
  });
  it("rejects a token signed for another user, another secret or malformed input", () => {
    const t = signMarketingToken(SECRET, 42);
    assert.equal(verifyMarketingToken(SECRET, t.replace(/^42\./, "43.")), null);
    assert.equal(verifyMarketingToken("y".repeat(32), t), null);
    assert.equal(verifyMarketingToken(SECRET, "42"), null);
    assert.equal(verifyMarketingToken(SECRET, "0." + "a".repeat(32)), null);
    assert.equal(verifyMarketingToken(SECRET, `${t}x`), null);
  });
  it("counts UTC days since 1970", () => {
    assert.equal(epochDay(new Date("1970-01-02T00:00:00.000Z")), 1);
    assert.equal(epochDay(new Date("1970-01-02T23:59:59.999Z")), 1);
  });
});
