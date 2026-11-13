import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chatToolsFor, runChatTool, toolStatus } from "../src/services/chat-tools.service";
import { normalizeSubjectCode } from "../src/utils/subject-code";

describe("normalizeSubjectCode", () => {
  it("reads the same subject however it is typed", () => {
    for (const raw of ["pro 192", "pro-192", "Pro192", " PRO_192 "]) assert.equal(normalizeSubjectCode(raw), "PRO192");
  });
  it("rejects junk", () => {
    assert.equal(normalizeSubjectCode("!!"), null);
    assert.equal(normalizeSubjectCode(""), null);
  });
});

describe("chat tools", () => {
  it("gives guests only recent_exams and members their data too", () => {
    assert.deepEqual(chatToolsFor(null).map((t) => t.name), ["recent_exams"]);
    assert.deepEqual(chatToolsFor(7).map((t) => t.name), ["get_my_data", "recent_exams"]);
  });
  it("answers an invalid subject with an error before touching the database", async () => {
    const out = JSON.parse(await runChatTool(null, "recent_exams", { subject: "!!" }));
    assert.ok(typeof out.error === "string" && out.error.length > 0);
  });
  it("no longer offers the live FuOverflow tool", async () => {
    const out = JSON.parse(await runChatTool(null, "find_fuo_exams", { subject: "PRO192" }));
    assert.ok(out.error);
  });
  it("tells the user which subject is being looked up", () => {
    assert.ok(toolStatus("recent_exams", { subject: "PRO192" }).includes("PRO192"));
  });
});
