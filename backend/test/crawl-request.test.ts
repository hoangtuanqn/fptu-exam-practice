import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { importExamBody } from "../src/rules/requests/crawl.request";
import { isManualThreadId } from "../src/utils/exam-upload";

const URL = "https://fuoverflow.com/threads/mae101-fa26-fe.7094/";
const ID = "0199A1B2-C3D4-7E5F-8A9B-0C1D2E3F4A5B";

describe("importExamBody: exactly one of url / examId", () => {
  it("accepts a FuOverflow link as before", () => {
    assert.equal(importExamBody.parse({ url: URL }).url, URL);
  });
  it("accepts an exam id and lower-cases it", () => {
    const v = importExamBody.parse({ examId: ID, subject: "mae101" });
    assert.equal(v.examId, ID.toLowerCase());
    assert.equal(v.url, undefined);
    assert.equal(v.subject, "MAE101");
  });
  it("rejects both, neither, a bad id and a non-FuOverflow link", () => {
    assert.equal(importExamBody.safeParse({ url: URL, examId: ID }).success, false);
    assert.equal(importExamBody.safeParse({}).success, false);
    assert.equal(importExamBody.safeParse({ examId: "m3fa09c0a1b2c" }).success, false);
    assert.equal(importExamBody.safeParse({ url: "https://fuoverflow.com/threads/m3fa09c0a1b2c/" }).success, false);
  });
});

describe("isManualThreadId", () => {
  it("flags manual upload threads only", () => {
    assert.equal(isManualThreadId("m3fa09c0a1b2c"), true);
    assert.equal(isManualThreadId("7094"), false);
  });
});

describe("subjectOfExam", () => {
  it("prefers the stored subject code, then the title", async () => {
    const { subjectOfExam } = await import("../src/utils/subject-code");
    assert.equal(subjectOfExam({ subjectCode: "SSA101", title: "Đề tải tay không có mã" }), "SSA101");
    assert.equal(subjectOfExam({ subjectCode: null, title: "MAE101 - FA26 - FE" }), "MAE101");
  });
});
