import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { examRelPath } from "../src/utils/exam-path";

describe("examRelPath", () => {
  it("recognises exam images and returns the thread id", () => {
    assert.deepEqual(examRelPath("/exams/123/images/1.webp"), { rel: "exams/123/images/1.webp", threadId: "123" });
  });

  it("does not claim other files (avatars, anything outside exams/)", () => {
    for (const p of ["/avatars/u1.webp", "/x/exams/123/images/1.webp", "/exam/123/images/1.webp"]) assert.equal(examRelPath(p), null, p);
  });

  it("catches exams/ in every spelling so static cannot serve it unauthenticated", () => {
    for (const p of ["/EXAMS/123/images/1.webp", "/exams//123/images/1.webp", "/%65xams/123/images/1.webp", "/a/../exams/123/images/1.webp", "/exams\\123\\images\\1.webp"]) {
      const r = examRelPath(p);
      assert.ok(r && r !== "blocked" && r.threadId === "123", p);
    }
  });

  it("blocks the attachment folder and malformed encodings", () => {
    for (const p of ["/exams/123/files/a.zip", "/exams/123/%2e/files/a.zip", "/exams/123/x/../files/a.zip", "/exams/%E0%A4%A"]) assert.equal(examRelPath(p), "blocked", p);
  });
});
