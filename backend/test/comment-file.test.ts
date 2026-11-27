import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXAM_COMMENT_FILE_MAX_BYTES, EXAM_COMMENT_FILE_NAME_MAX, EXAM_COMMENT_IMAGE_MAX_BYTES, EXAM_COMMENT_MENTIONS_MAX } from "../src/constants/exam-comment";
import { createCommentBody, createCommentForm, mentionsQuery } from "../src/rules/requests/exam-comment.request";
import { commentNoticeService } from "../src/services/exam-comment-notice.service";
import { imageMimeOf, isImageAttachment } from "../src/utils/attachment";
import { checkCommentFile, commentFileDisplayName, commentFileHeaders, isCommentFileStaticPath } from "../src/utils/comment-file";
import { isValidExamFileSignature, signExamFile } from "../src/utils/exam-path";

// Tệp đính kèm và nhắc tên của bình luận (decision 0020): kiểm tra tệp, tên hiển thị, chặn tĩnh, header, form multipart, ảnh đính kèm của đề

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const kind = (name: string, buf: Buffer) => {
  const r = checkCommentFile(name, buf);
  return "kind" in r ? r.kind : "error";
};

describe("comment files", () => {
  it("decides the type by extension and checks the first bytes", () => {
    assert.equal(kind("a.PNG", PNG), "image");
    assert.equal(kind("a.jpg", PNG), "image"); // chữ ký ảnh bất kỳ trong ba loại; sharp giải mã thật ở service
    assert.equal(kind("a.pdf", Buffer.from("%PDF-1.4 ...")), "pdf");
    assert.equal(kind("a.zip", Buffer.from([0x50, 0x4b, 3, 4, 0])), "zip");
    assert.equal(kind("a.zip", Buffer.from([0x50, 0x4b, 5, 6, 0])), "zip");
    assert.equal(kind("a.txt", Buffer.from("xin chào\n")), "txt");
    // sai nội dung, sai loại, rỗng, quá lớn
    assert.equal(kind("a.pdf", Buffer.from("<html>")), "error");
    assert.equal(kind("a.zip", Buffer.from("PKxx")), "error");
    assert.equal(kind("a.txt", Buffer.from([0x61, 0, 0x62])), "error");
    assert.equal(kind("a.png", Buffer.from("%PDF-")), "error");
    assert.equal(kind("a.exe", Buffer.from("MZ")), "error");
    assert.equal(kind("a.svg", Buffer.from("<svg/>")), "error");
    assert.equal(kind("noext", Buffer.from("x")), "error");
    assert.equal(kind("a.txt", Buffer.alloc(0)), "error");
    assert.equal(kind("a.png", Buffer.concat([PNG, Buffer.alloc(EXAM_COMMENT_IMAGE_MAX_BYTES)])), "error");
    assert.equal(kind("a.txt", Buffer.alloc(EXAM_COMMENT_FILE_MAX_BYTES + 1, 0x61)), "error");
    assert.equal(kind("a.txt", Buffer.alloc(EXAM_COMMENT_FILE_MAX_BYTES, 0x61)), "txt");
  });

  it("sanitises the display name and gives images the .webp extension", () => {
    assert.equal(commentFileDisplayName("C:\\Users\\x\\ảnh đề.JPG", "image"), "ảnh đề.webp");
    assert.equal(commentFileDisplayName("../../etc/passwd.txt", "txt"), "passwd.txt");
    assert.equal(commentFileDisplayName("bad\u0000na\u202eme.pdf", "pdf"), "badname.pdf");
    assert.equal(commentFileDisplayName("a.exe.pdf", "pdf"), "a.exe.pdf");
    assert.equal(commentFileDisplayName("   ", "zip"), "tep.zip");
    assert.ok(commentFileDisplayName(`${"a".repeat(500)}.txt`, "txt").length <= EXAM_COMMENT_FILE_NAME_MAX);
  });

  it("never serves comment files from the public static folder", () => {
    for (const p of ["/comments/e/x.webp", "/COMMENTS/e/x.pdf", "/%63omments/e/x", "/./comments/x", "/a/../comments/x", "/comments", "/%E0%A4%A"]) assert.equal(isCommentFileStaticPath(p), true, p);
    for (const p of ["/avatars/a.webp", "/commentsx/a", "/exams/t/1.webp"]) assert.equal(isCommentFileStaticPath(p), false, p);
  });

  it("serves images inline and everything else as a download, always nosniff", () => {
    const img = commentFileHeaders("ảnh.webp", "image/webp");
    assert.equal(img["Content-Type"], "image/webp");
    assert.match(img["Content-Disposition"], /^inline; filename="_nh\.webp"; filename\*=UTF-8''%E1%BA%A3nh\.webp$/);
    assert.equal(img["X-Content-Type-Options"], "nosniff");
    for (const [name, mime] of [["a.pdf", "application/pdf"], ["a.zip", "application/zip"], ["a.txt", "text/plain"]] as const) {
      const h = commentFileHeaders(name, mime);
      assert.match(h["Content-Disposition"], /^attachment;/, name);
      assert.equal(h["X-Content-Type-Options"], "nosniff");
    }
    assert.match(commentFileHeaders('x"\\.txt', "text/plain")["Content-Disposition"], /filename="x__\.txt"/);
  });

  it("binds a signed link to one file path", () => {
    const exp = Date.now() + 60_000;
    const q = new URLSearchParams(signExamFile("comments/e/a.webp", exp, "secret"));
    assert.equal(isValidExamFileSignature("comments/e/a.webp", q.get("e"), q.get("s"), "secret"), true);
    assert.equal(isValidExamFileSignature("comments/e/b.webp", q.get("e"), q.get("s"), "secret"), false);
    assert.equal(isValidExamFileSignature("comments/e/a.webp", q.get("e"), q.get("s"), "secret", exp + 1), false);
  });
});

describe("comment form and mentions", () => {
  const ref = "0192f0c4-0000-7000-8000-000000000001";
  it("parses multipart text fields like the JSON body", () => {
    assert.deepEqual(createCommentForm.parse({ questionNumber: "-3", body: " hi ", replyToId: "" }), { questionNumber: -3, body: "hi", replyToId: undefined });
    assert.deepEqual(createCommentForm.parse({ questionNumber: "0", body: "x", mentions: ref }).mentions, [ref]);
    assert.deepEqual(createCommentForm.parse({ questionNumber: "1", body: "x", mentions: [ref, "zz"] }).mentions, [ref, "zz"]);
    assert.deepEqual(createCommentForm.parse({ questionNumber: "1", body: "x", mentions: JSON.stringify([ref]) }).mentions, [ref]);
    for (const bad of [{ questionNumber: "", body: "x" }, { questionNumber: "1.5", body: "x" }, { questionNumber: "1e3", body: "x" }, { questionNumber: "1", body: "x", mentions: "[oops" }]) {
      assert.equal(createCommentForm.safeParse(bad).success, false, JSON.stringify(bad));
    }
    const many = Array.from({ length: EXAM_COMMENT_MENTIONS_MAX + 1 }, () => ref);
    assert.equal(createCommentForm.safeParse({ questionNumber: "1", body: "x", mentions: many }).success, false);
    assert.equal(createCommentBody.safeParse({ questionNumber: 1, body: "x", mentions: many }).success, false);
    assert.equal(createCommentBody.safeParse({ questionNumber: "1", body: "x" }).success, false); // JSON vẫn bắt số
    assert.deepEqual(createCommentBody.parse({ questionNumber: 1, body: "x", mentions: [ref] }).mentions, [ref]);
  });

  it("validates the mention search query", () => {
    assert.deepEqual(mentionsQuery.parse({}), { q: "", limit: 8 });
    assert.deepEqual(mentionsQuery.parse({ q: " an ", limit: "3" }), { q: "an", limit: 3 });
    assert.equal(mentionsQuery.safeParse({ limit: "0" }).success, false);
    assert.equal(mentionsQuery.safeParse({ q: "x".repeat(200) }).success, false);
  });

  it("notifies each mentioned member once, never the author or someone already told about the reply", () => {
    const sent = commentNoticeService.mention({ examId: "e", questionNumber: 1, commentId: "c", body: "x" }, { id: "a", name: "A" }, ["b", "b", "a", "c", "d"], ["c", null, undefined]);
    assert.deepEqual(sent, ["b", "d"]);
  });
});

describe("exam attachments as comment targets", () => {
  it("only images count, by mime or by the stored file extension (same set as the web)", () => {
    assert.equal(isImageAttachment({ mime: "image/png", filePath: "exams/t/files/x" }), true);
    for (const ext of ["webp", "png", "jpg", "JPEG", "gif"]) assert.equal(isImageAttachment({ mime: "application/octet-stream", filePath: `exams/t/files/a.${ext}` }), true, ext);
    for (const ext of ["pdf", "zip", "txt", "mp4", "svg"]) assert.equal(isImageAttachment({ mime: "application/octet-stream", filePath: `exams/t/files/a.${ext}` }), false, ext);
    assert.deepEqual(["a.jpg", "a.png", "a.webp", "a.gif", "a.pdf"].map(imageMimeOf), ["image/jpeg", "image/png", "image/webp", "image/gif", null]);
  });
});
