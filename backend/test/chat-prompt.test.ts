import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CHAT_SYSTEM_PROMPT } from "../src/constants/chat";

describe("chat system prompt", () => {
  it("points exam questions at recent_exams and has exam advice rules", () => {
    assert.ok(CHAT_SYSTEM_PROMPT.includes("recent_exams"));
    assert.ok(CHAT_SYSTEM_PROMPT.includes("<exam_advice>"));
  });
  it("no longer mentions the live FuOverflow tool", () => {
    assert.ok(!CHAT_SYSTEM_PROMPT.includes("find_fuo_exams"));
  });
  it("lets syllabus answers be complete while other answers stay short", () => {
    assert.ok(/syllabus[^\n]*(complete|in full|full)/i.test(CHAT_SYSTEM_PROMPT));
    assert.ok(CHAT_SYSTEM_PROMPT.includes("under 120 words"));
  });
});
