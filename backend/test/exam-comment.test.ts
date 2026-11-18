import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { EXAM_COMMENT_BULK_MAX, EXAM_COMMENT_MAX_LENGTH, EXAM_COMMENT_PER_DAY } from "../src/constants/exam-comment";
import {
  bulkReviewCommentsBody,
  cleanCommentBody,
  commentParam,
  createCommentBody,
  listAdminCommentsQuery,
  listCommentsQuery,
  reviewCommentBody,
} from "../src/rules/requests/exam-comment.request";
import { commentLimitError, toPublicComment } from "../src/services/exam-comment.service";

// Bình luận câu hỏi: validator, quy tắc gửi (giới hạn ngày, trùng), dạng dòng công khai (không lộ id người viết).

const EXAM = "0190f5a2-1c3b-7000-8001-0123456789ab";
const USER = "0190f5a2-1c3b-7000-8002-0123456789ab";
const OTHER = "0190f5a2-1c3b-7000-8003-0123456789ab";

describe("exam comment validators", () => {
  it("cleans the body: control and bidi chars removed, CRLF normalised, blank lines collapsed, trimmed", () => {
    assert.equal(cleanCommentBody("  a\u0000b‮c\u0007  "), "abc");
    assert.equal(cleanCommentBody("x\r\ny\rz"), "x\ny\nz");
    assert.equal(cleanCommentBody("x\n\n\n\n\ny"), "x\n\ny");
    assert.equal(cleanCommentBody("<b>hi</b>"), "<b>hi</b>"); // văn bản thuần: không sửa, giao diện hiển thị dạng text
  });

  it("accepts a valid body and rejects empty, too long and bad question numbers", () => {
    assert.deepEqual(createCommentBody.parse({ questionNumber: 3, body: "  Đáp án B mới đúng  " }), { questionNumber: 3, body: "Đáp án B mới đúng" });
    assert.equal(createCommentBody.safeParse({ questionNumber: 1, body: "   \u0000 " }).success, false);
    assert.equal(createCommentBody.safeParse({ questionNumber: 1, body: "a".repeat(EXAM_COMMENT_MAX_LENGTH) }).success, true);
    assert.equal(createCommentBody.safeParse({ questionNumber: 1, body: "a".repeat(EXAM_COMMENT_MAX_LENGTH + 1) }).success, false);
    // dài vì khoảng trắng hai đầu nhưng nội dung vừa đủ: vẫn hợp lệ
    assert.equal(createCommentBody.safeParse({ questionNumber: 1, body: ` ${"a".repeat(EXAM_COMMENT_MAX_LENGTH)} ` }).success, true);
    for (const questionNumber of [0, -1, 1.5, "2"]) assert.equal(createCommentBody.safeParse({ questionNumber, body: "ok" }).success, false);
  });

  it("parses list queries and params", () => {
    assert.deepEqual(listCommentsQuery.parse({ question: "4" }), { question: 4, page: 1, limit: 20 });
    assert.equal(listCommentsQuery.safeParse({}).success, false);
    assert.equal(listCommentsQuery.safeParse({ question: "0" }).success, false);
    assert.equal(listAdminCommentsQuery.parse({}).status, "PENDING");
    assert.equal(listAdminCommentsQuery.parse({ status: "all" }).status, "all");
    assert.equal(listAdminCommentsQuery.safeParse({ status: "DELETED" }).success, false);
    assert.equal(commentParam.safeParse({ id: EXAM, commentId: "12" }).success, false);
    assert.equal(commentParam.parse({ id: EXAM.toUpperCase(), commentId: USER }).id, EXAM);
  });

  it("only allows APPROVED/REJECTED as review targets and bounds bulk ids", () => {
    assert.equal(reviewCommentBody.safeParse({ status: "PENDING" }).success, false);
    assert.equal(reviewCommentBody.safeParse({ status: "APPROVED", note: "x".repeat(256) }).success, false);
    assert.deepEqual(reviewCommentBody.parse({ status: "REJECTED", note: " spam " }), { status: "REJECTED", note: "spam" });
    assert.equal(bulkReviewCommentsBody.safeParse({ ids: [], status: "APPROVED" }).success, false);
    assert.equal(bulkReviewCommentsBody.safeParse({ ids: Array(EXAM_COMMENT_BULK_MAX + 1).fill(USER), status: "APPROVED" }).success, false);
    assert.equal(bulkReviewCommentsBody.safeParse({ ids: ["nope"], status: "APPROVED" }).success, false);
  });
});

describe("exam comment rules", () => {
  const next = { examId: EXAM, questionNumber: 2, body: "Câu này đáp án C" };

  it("blocks the daily limit before checking duplicates", () => {
    const full = Array.from({ length: EXAM_COMMENT_PER_DAY }, (_, i) => ({ examId: EXAM, questionNumber: 100 + i, body: `b${i}` }));
    assert.equal(commentLimitError(full, next), "daily");
    assert.equal(commentLimitError(full.slice(1), next), null);
  });

  it("rejects the same text on the same question (case and spacing ignored), not on another question", () => {
    assert.equal(commentLimitError([{ ...next, body: "câu NÀY  đáp án c" }], next), "duplicate");
    assert.equal(commentLimitError([{ ...next, questionNumber: 3 }], next), null);
    assert.equal(commentLimitError([{ ...next, examId: OTHER }], next), null);
  });

  it("public rows never carry the author id or email, and mark the viewer's own comment", () => {
    const row = {
      id: "c1",
      questionNumber: 2,
      body: "hi",
      status: "APPROVED" as const,
      createdAt: new Date(0),
      userId: USER,
      user: { fullName: "Nguyen Van A", avatarPath: "avatars/abc.webp" },
    };
    const mine = toPublicComment(row, USER);
    assert.equal(mine.mine, true);
    assert.equal(JSON.stringify(mine).includes(USER), false);
    assert.deepEqual(Object.keys(mine).sort(), ["author", "body", "createdAt", "id", "mine", "questionNumber", "status"]);
    assert.equal(mine.author.name, "Nguyen Van A");
    assert.match(mine.author.avatarUrl ?? "", /\/api\/v1\/files\/avatars\/abc\.webp$/);
    assert.equal(toPublicComment(row, OTHER).mine, false);
    assert.equal(toPublicComment(row, null).mine, false);
    // ảnh cũ đặt tên theo id người dùng: không trả ra
    assert.equal(toPublicComment({ ...row, user: { ...row.user, avatarPath: `avatars/${USER}-x.webp` } }, null).author.avatarUrl, null);
  });
});
