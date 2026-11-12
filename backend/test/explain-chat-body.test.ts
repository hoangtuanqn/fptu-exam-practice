import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasModule } from "../src/prompts";
import { explainChatBody } from "../src/rules/requests/explanation.request";

const body = (messages: { role: string; content: string }[]) => ({ examId: 1, questionNumber: 1, messages });

describe("explainChatBody", () => {
  it("limits the student's message to 1000 chars", () => {
    assert.equal(explainChatBody.safeParse(body([{ role: "user", content: "a".repeat(1000) }])).success, true);
    assert.equal(explainChatBody.safeParse(body([{ role: "user", content: "a".repeat(1001) }])).success, false);
  });

  it("accepts a long AI reply in the history so the conversation can continue", () => {
    const long = "b".repeat(3000);
    assert.equal(explainChatBody.safeParse(body([{ role: "user", content: "hi" }, { role: "assistant", content: long }, { role: "user", content: "tiếp" }])).success, true);
  });

  it("rejects extra keys (no attachments) and a last message that is not from the student", () => {
    assert.equal(explainChatBody.safeParse(body([{ role: "user", content: "hi", image: "x" } as never])).success, false);
    assert.equal(explainChatBody.safeParse(body([{ role: "assistant", content: "hi" }])).success, false);
  });
});

describe("chat-explain modules", () => {
  it("has a PFP191 module", () => assert.equal(hasModule("chat-explain", "PFP191"), true));
});
