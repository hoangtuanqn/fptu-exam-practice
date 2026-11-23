import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { importExamBody } from "../src/rules/requests/crawl.request";

const ID = "0199A1B2-C3D4-7E5F-8A9B-0C1D2E3F4A5B";

describe("importExamBody: examId only", () => {
  it("accepts an exam id and lower-cases it", () => {
    const v = importExamBody.parse({ examId: ID, subject: "mae101" });
    assert.equal(v.examId, ID.toLowerCase());
    assert.equal(v.subject, "MAE101");
  });
  it("rejects a missing or bad id, and ignores a link", () => {
    assert.equal(importExamBody.safeParse({}).success, false);
    assert.equal(importExamBody.safeParse({ examId: "m3fa09c0a1b2c" }).success, false);
    assert.equal(importExamBody.safeParse({ url: "https://example.com/threads/x.1/" }).success, false);
  });
});

describe("subjectOfExam", () => {
  it("prefers the stored subject code, then the title", async () => {
    const { subjectOfExam } = await import("../src/utils/subject-code");
    assert.equal(subjectOfExam({ subjectCode: "SSA101", title: "Đề tải tay không có mã" }), "SSA101");
    assert.equal(subjectOfExam({ subjectCode: null, title: "MAE101 - FA26 - FE" }), "MAE101");
  });
});
