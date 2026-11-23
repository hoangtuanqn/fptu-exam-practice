import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { attachmentHeaders, attachmentKind, isAttachmentStaticPath } from "../src/utils/attachment";

describe("isAttachmentStaticPath", () => {
  it("blocks exams/<id>/files/ in every spelling, lets images through", () => {
    for (const p of [
      "/exams/123/files/a.txt",
      "/EXAMS/123/Files/a.txt",
      "/exams/123/./files/a.txt",
      "/exams/./123/files/a.txt",
      "/exams/123/%2e/files/a.txt",
      "/exams/123/x/../files/a.txt",
      "//exams//123//files/a.txt",
      "/exams%2f123%2ffiles%2fa.txt",
      "/exams\\123\\files\\a.txt",
      "/exams%5c123%5cfiles%5ca.txt",
      "/exams/123/files",
      "/exams/123/%E0%A4%A", // mã hoá lỗi
    ]) {
      assert.equal(isAttachmentStaticPath(p), true, p);
    }
    for (const p of ["/exams/123/images/q1.jpg", "/exams/123/filesx/a.txt", "/exams/files/a.txt"]) {
      assert.equal(isAttachmentStaticPath(p), false, p);
    }
  });
});

describe("attachmentHeaders", () => {
  it("inlines only pdf/text/media, everything else is an octet-stream download", () => {
    assert.match(attachmentHeaders("paper.pdf", "x/paper.pdf", false)["Content-Disposition"], /^inline;/);
    assert.equal(attachmentHeaders("a.md", "x/a.md", false)["Content-Type"], "text/plain; charset=utf-8");
    assert.match(attachmentHeaders("paper.pdf", "x/paper.pdf", true)["Content-Disposition"], /^attachment;/);
    const zip = attachmentHeaders("đề.zip", "x/de.zip", false);
    assert.equal(zip["Content-Type"], "application/octet-stream");
    assert.match(zip["Content-Disposition"], /^attachment; .*filename\*=UTF-8''%C4%91%E1%BB%81\.zip$/);
    assert.equal(attachmentHeaders("x.html", "x/x.html", false)["Content-Type"], "application/octet-stream");
    assert.equal(attachmentKind("x/v.MP4"), "video");
    assert.equal(attachmentKind("x/v.exe"), "other");
  });
});
