import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chatQuotaService } from "../src/services/chat-quota.service";
import { needsCaptcha } from "../src/utils/chat-quota";

describe("needsCaptcha", () => {
  it("lets the first batch through and asks for a captcha at every full batch after it", () => {
    for (let used = 0; used < 10; used++) assert.equal(needsCaptcha(used, 10), false, `used ${used}`);
    assert.equal(needsCaptcha(10, 10), true);
    for (let used = 11; used < 20; used++) assert.equal(needsCaptcha(used, 10), false, `used ${used}`);
    assert.equal(needsCaptcha(20, 10), true);
  });
  it("uses the bigger batch for members", () => {
    assert.equal(needsCaptcha(19, 20), false);
    assert.equal(needsCaptcha(20, 20), true);
    assert.equal(needsCaptcha(40, 20), true);
  });
});

describe("chatQuotaService.check", () => {
  const calls: unknown[][] = [];
  const deps = (used: number, fail = false) => ({
    count: async () => used,
    assert: async (...args: unknown[]) => {
      calls.push(args);
      if (fail) throw new Error("captcha");
    },
  });

  it("does not ask a guest for a captcha inside the first 10 messages of the day", async () => {
    calls.length = 0;
    await chatQuotaService.check({ guestId: "g1" }, undefined, "1.1.1.1", deps(9));
    assert.equal(calls.length, 0);
  });
  it("asks a guest for a captcha on the 11th message and passes the token on", async () => {
    calls.length = 0;
    await chatQuotaService.check({ guestId: "g1" }, "tok", "1.1.1.1", deps(10));
    assert.deepEqual(calls, [["tok", "1.1.1.1"]]);
  });
  it("gives a signed-in member 20 messages before the captcha", async () => {
    calls.length = 0;
    await chatQuotaService.check({ userId: 5 }, undefined, "1.1.1.1", deps(10));
    assert.equal(calls.length, 0);
    await chatQuotaService.check({ userId: 5 }, "tok", "1.1.1.1", deps(20));
    assert.equal(calls.length, 1);
  });
  it("rejects when the captcha fails", async () => {
    await assert.rejects(chatQuotaService.check({ guestId: "g1" }, "bad", undefined, deps(10, true)), /captcha/);
  });
});
