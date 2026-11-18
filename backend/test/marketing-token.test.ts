import assert from "node:assert/strict";
import crypto from "node:crypto";
import { describe, it } from "node:test";
import { epochDay, signMarketingToken, verifyMarketingToken } from "../src/utils/marketing-token";

const SECRET = "x".repeat(32);
const USER = "0190f5a2-1c3b-7000-8001-0123456789ab";
const OTHER = "0190f5a2-1c3b-7000-8002-0123456789ab";

describe("marketing unsubscribe token", () => {
  it("round-trips the user id", () => {
    assert.equal(verifyMarketingToken(SECRET, signMarketingToken(SECRET, USER)), USER);
  });
  it("still verifies links sent before migration 0080 (numeric id), returning the id as text", () => {
    const legacy = `42.${crypto.createHmac("sha256", SECRET).update("marketing-unsubscribe:42").digest("hex").slice(0, 32)}`;
    assert.equal(verifyMarketingToken(SECRET, legacy), "42");
  });
  it("rejects a token signed for another user, another secret or malformed input", () => {
    const t = signMarketingToken(SECRET, USER);
    assert.equal(verifyMarketingToken(SECRET, t.replace(USER, OTHER)), null);
    assert.equal(verifyMarketingToken("y".repeat(32), t), null);
    assert.equal(verifyMarketingToken(SECRET, USER), null);
    assert.equal(verifyMarketingToken(SECRET, "0." + "a".repeat(32)), null);
    assert.equal(verifyMarketingToken(SECRET, `${t}x`), null);
    assert.equal(verifyMarketingToken(SECRET, t.toUpperCase()), null);
  });
  it("counts UTC days since 1970", () => {
    assert.equal(epochDay(new Date("1970-01-02T00:00:00.000Z")), 1);
    assert.equal(epochDay(new Date("1970-01-02T23:59:59.999Z")), 1);
  });
});
