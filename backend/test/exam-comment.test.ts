import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EXAM_COMMENT_BULK_MAX,
  EXAM_COMMENT_MAX_LENGTH,
  EXAM_COMMENT_MAX_LINES,
  EXAM_COMMENT_NEW_ACCOUNT_PER_DAY,
  EXAM_COMMENT_PER_DAY,
  EXAM_COMMENT_PER_QUESTION_PER_DAY,
  EXAM_COMMENT_SPAM_QUESTIONS,
  EXAM_COMMENT_STRIKES,
} from "../src/constants/exam-comment";
import {
  bulkReviewCommentsBody,
  cleanCommentBody,
  commentParam,
  createCommentBody,
  likeBody,
  listAdminCommentsQuery,
  listCommentsQuery,
  questionParam,
  reactionBody,
  reportCommentBody,
  reviewCommentBody,
  voteBody,
  voteParam,
} from "../src/rules/requests/exam-comment.request";
import { commentLimitError, holdReason, toPublicComment } from "../src/services/exam-comment.service";
import { tallyVotes } from "../src/services/exam-reaction.service";

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
    for (const questionNumber of [0, 1.5, "2", 2 ** 31]) assert.equal(createCommentBody.safeParse({ questionNumber, body: "ok" }).success, false);
    assert.equal(createCommentBody.parse({ questionNumber: -7, body: "ok" }).questionNumber, -7); // tệp đính kèm id 7
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

describe("exam comment reaction validators", () => {
  it("bounds lines, parses votes, likes, reports and question params", () => {
    const lines = (n: number) => Array.from({ length: n }, (_, i) => `dòng ${i}`).join("\n");
    assert.equal(createCommentBody.safeParse({ questionNumber: 1, body: lines(EXAM_COMMENT_MAX_LINES) }).success, true);
    assert.equal(createCommentBody.safeParse({ questionNumber: 1, body: lines(EXAM_COMMENT_MAX_LINES + 1) }).success, false);
    assert.deepEqual(voteBody.parse({ answers: ["C", "A", "C"] }), { answers: ["A", "C"] });
    assert.deepEqual(voteBody.parse({ answers: [] }), { answers: [] });
    for (const answers of [["I"], ["a"], "A", [1]]) assert.equal(voteBody.safeParse({ answers }).success, false);
    assert.equal(likeBody.safeParse({ liked: "yes" }).success, false);
    assert.deepEqual(reportCommentBody.parse(undefined), {});
    assert.equal(createCommentBody.parse({ questionNumber: 1, body: "ok", replyToId: USER.toUpperCase() }).replyToId, USER);
    assert.equal(createCommentBody.safeParse({ questionNumber: 1, body: "ok", replyToId: "x" }).success, false);
    for (const reaction of ["like", "dislike", null]) assert.deepEqual(reactionBody.parse({ reaction }), { reaction });
    for (const body of [{}, { reaction: "love" }, { reaction: true }]) assert.equal(reactionBody.safeParse(body).success, false);
    assert.deepEqual(reportCommentBody.parse({ reason: "  " }), { reason: null });
    assert.equal(reportCommentBody.safeParse({ reason: "x".repeat(256) }).success, false);
    assert.deepEqual(questionParam.parse({ id: EXAM, number: "3" }), { id: EXAM, number: 3 });
    assert.equal(questionParam.safeParse({ id: EXAM, number: "0" }).success, false);
    assert.equal(questionParam.parse({ id: EXAM, number: "-4" }).number, -4);
    assert.equal(listCommentsQuery.parse({ question: "-4" }).question, -4);
    assert.equal(voteParam.safeParse({ id: EXAM, number: "-4" }).success, false); // tệp đính kèm không có bình chọn
    assert.equal(voteParam.parse({ id: EXAM, number: "2" }).number, 2);
    assert.equal(listAdminCommentsQuery.parse({ status: "REPORTED" }).status, "REPORTED");
  });
});

describe("exam comment rules", () => {
  const base = { today: 0, onQuestion: [] as string[], newAccount: false };
  const body = "Câu này đáp án C";

  it("applies the daily limit (lower for new accounts) before anything else", () => {
    assert.equal(commentLimitError({ ...base, today: EXAM_COMMENT_PER_DAY }, body), "daily");
    assert.equal(commentLimitError({ ...base, today: EXAM_COMMENT_PER_DAY - 1 }, body), null);
    assert.equal(commentLimitError({ ...base, today: EXAM_COMMENT_NEW_ACCOUNT_PER_DAY, newAccount: true }, body), "daily");
    assert.equal(commentLimitError({ ...base, today: EXAM_COMMENT_NEW_ACCOUNT_PER_DAY }, body), null);
  });

  it("rejects the same text on the same question (case and spacing ignored) and too many comments on one question", () => {
    assert.equal(commentLimitError({ ...base, onQuestion: ["câu NÀY  đáp án c"] }, body), "duplicate");
    assert.equal(commentLimitError({ ...base, onQuestion: ["khác"] }, body), null);
    const full = Array.from({ length: EXAM_COMMENT_PER_QUESTION_PER_DAY }, (_, i) => `b${i}`);
    assert.equal(commentLimitError({ ...base, onQuestion: full }, body), "question");
  });

  it("holds for content first, then repeated text elsewhere, then strikes", () => {
    const clean = { sameElsewhere: 0, strikes: 0 };
    assert.equal(holdReason(null, clean), null);
    assert.equal(holdReason("LINK", { sameElsewhere: 9, strikes: 9 }), "LINK");
    assert.equal(holdReason(null, { ...clean, sameElsewhere: EXAM_COMMENT_SPAM_QUESTIONS - 1 }), "SPAM");
    assert.equal(holdReason(null, { ...clean, sameElsewhere: EXAM_COMMENT_SPAM_QUESTIONS - 2 }), null);
    assert.equal(holdReason(null, { ...clean, strikes: EXAM_COMMENT_STRIKES }), "STRIKES");
    assert.equal(holdReason(null, { ...clean, strikes: EXAM_COMMENT_STRIKES - 1 }), null);
  });

  it("tallies votes per letter without revealing voters", () => {
    assert.deepEqual(tallyVotes([{ answers: "A", count: 2 }, { answers: "A C", count: 1 }], "A C"), { voters: 3, counts: { A: 3, C: 1 }, mine: ["A", "C"] });
    assert.deepEqual(tallyVotes([], null), { voters: 0, counts: {}, mine: [] });
  });

  it("public rows never carry the author id, email or flag reason, and mark the viewer's own comment", () => {
    const row = {
      id: "c1",
      questionNumber: 2,
      body: "hi",
      status: "APPROVED" as const,
      createdAt: new Date(0),
      userId: USER,
      user: { fullName: "Nguyen Van A", avatarPath: "avatars/abc.webp", role: "USER" as const, proExpiresAt: new Date(Date.now() + 60_000) },
      parentId: null as string | null,
      replyToId: null as string | null,
      replyTo: null as { user: { fullName: string } } | null,
    };
    const mine = toPublicComment(row, USER, { likes: 4, dislikes: 1, reaction: "like", replyCount: 2 });
    assert.equal(mine.mine, true);
    assert.equal(JSON.stringify(mine).includes(USER), false);
    assert.deepEqual(Object.keys(mine).sort(), [
      "author", "body", "createdAt", "dislikes", "id", "liked", "likes", "mine", "parentId", "questionNumber", "reaction", "replyCount", "replyTo", "status",
    ]);
    assert.deepEqual(Object.keys(mine.author).sort(), ["avatarUrl", "isAdmin", "isPro", "name"]);
    assert.equal(mine.author.name, "Nguyen Van A");
    assert.equal(mine.author.isPro, true);
    assert.equal(mine.author.isAdmin, false);
    assert.deepEqual([mine.likes, mine.liked, mine.dislikes, mine.reaction, mine.replyCount, mine.replyTo], [4, true, 1, "like", 2, null]);
    assert.deepEqual([toPublicComment(row, USER).likes, toPublicComment(row, USER).reaction], [0, null]);
    // trả lời: không có replyCount; replyTo chỉ khi trả lời một trả lời khác (không phải bình luận gốc)
    const reply = { ...row, parentId: "root", replyToId: "root", replyTo: { user: { fullName: "Root" } } };
    assert.deepEqual([toPublicComment(reply, null, { likes: 0, dislikes: 0, reaction: "dislike", replyCount: 5 }).replyCount, toPublicComment(reply, null).replyTo], [0, null]);
    assert.deepEqual(toPublicComment({ ...reply, replyToId: "r2", replyTo: { user: { fullName: "B" } } }, null).replyTo, { name: "B" });
    assert.equal(toPublicComment({ ...reply, replyToId: null, replyTo: null }, null).replyTo, null); // bình luận được trả lời đã bị xoá
    assert.equal(toPublicComment(reply, null, { likes: 0, dislikes: 0, reaction: "dislike", replyCount: 0 }).liked, false);
    assert.match(mine.author.avatarUrl ?? "", /\/api\/v1\/files\/avatars\/abc\.webp$/);
    assert.equal(toPublicComment(row, OTHER).mine, false);
    assert.equal(toPublicComment(row, null).liked, false);
    assert.equal(toPublicComment({ ...row, user: { ...row.user, role: "ADMIN", proExpiresAt: null } }, null).author.isAdmin, true);
    // ảnh cũ đặt tên theo id người dùng: không trả ra
    assert.equal(toPublicComment({ ...row, user: { ...row.user, avatarPath: `avatars/${USER}-x.webp` } }, null).author.avatarUrl, null);
  });
});
