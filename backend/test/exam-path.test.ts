import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { examRelPath, isValidExamFileSignature, signExamFile } from "../src/utils/exam-path";

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

describe("signed exam file links", () => {
  const SECRET = "0123456789abcdef0123456789abcdef0123";
  const REL = "exams/123/images/1.webp";
  const parse = (q: string) => Object.fromEntries(new URLSearchParams(q));

  it("accepts a fresh signature for the same path", () => {
    const q = parse(signExamFile(REL, Date.now() + 60_000, SECRET));
    assert.equal(isValidExamFileSignature(REL, q.e, q.s, SECRET), true);
  });

  it("rejects another path, another secret, an expired or tampered link", () => {
    const exp = Date.now() + 60_000;
    const q = parse(signExamFile(REL, exp, SECRET));
    assert.equal(isValidExamFileSignature("exams/123/images/2.webp", q.e, q.s, SECRET), false);
    assert.equal(isValidExamFileSignature(REL, q.e, q.s, "x".repeat(40)), false);
    assert.equal(isValidExamFileSignature(REL, q.e, q.s, SECRET, exp + 1), false);
    assert.equal(isValidExamFileSignature(REL, String(exp + 3_600_000), q.s, SECRET), false);
    assert.equal(isValidExamFileSignature(REL, undefined, undefined, SECRET), false);
  });
});
