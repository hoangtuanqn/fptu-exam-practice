import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CLICK_PLACEHOLDER, safeTarget, signClickToken, verifyClickToken, withClickUrl } from "../src/utils/marketing-click";
import { signMarketingToken } from "../src/utils/marketing-token";

const SECRET = "x".repeat(32);

describe("marketing click token", () => {
  it("round-trips the log id", () => {
    assert.equal(verifyClickToken(SECRET, signClickToken(SECRET, 7)), 7);
  });
  it("rejects tampered, foreign-secret and unsubscribe tokens", () => {
    const t = signClickToken(SECRET, 7);
    assert.equal(verifyClickToken(SECRET, t.replace(/^7\./, "8.")), null);
    assert.equal(verifyClickToken(SECRET, t.slice(0, -1) + (t.endsWith("0") ? "1" : "0")), null);
    assert.equal(verifyClickToken("y".repeat(32), t), null);
    assert.equal(verifyClickToken(SECRET, signMarketingToken(SECRET, 7)), null); // khác mục đích
    assert.equal(verifyClickToken(SECRET, "https://evil.example"), null);
  });
});

describe("click url in mail", () => {
  it("replaces every placeholder in html and text", () => {
    const mail = withClickUrl({ subject: "s", html: `<a href="${CLICK_PLACEHOLDER}">a</a><a href="${CLICK_PLACEHOLDER}">b</a>`, text: `Vào: ${CLICK_PLACEHOLDER}` }, "https://api/c?t=1.x");
    assert.equal(mail.html.includes(CLICK_PLACEHOLDER), false);
    assert.equal(mail.html.split("https://api/c?t=1.x").length, 3);
    assert.equal(mail.text, "Vào: https://api/c?t=1.x");
    assert.equal(mail.subject, "s");
  });
  it("keeps only internal paths as redirect targets", () => {
    assert.equal(safeTarget("/pro"), "/pro");
    for (const bad of [null, undefined, "", "pro", "//evil.example", "@evil.example", "https://evil.example"]) assert.equal(safeTarget(bad), "");
  });
});
