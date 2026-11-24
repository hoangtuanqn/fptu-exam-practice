import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { describe, it } from "node:test";
import express from "express";
import { errorHandler } from "../src/middlewares/error.middlewares";
import { oneExamUploadPerAdmin } from "../src/middlewares/single-flight.middlewares";
import { classifyExamGap, parseAnswersJson, planUploadNumbers, questionNumberOf, resourceFileNames } from "../src/utils/exam-upload";

const names = (...n: number[]) => n.map((x) => `Q${x}.webp`);
const okValue = <T>(r: { ok: true; value: T } | { ok: false; error: string }) => {
  assert.ok(r.ok, r.ok ? "" : r.error);
  return r.value;
};
const errorOf = (r: { ok: boolean; error?: string }) => {
  assert.equal(r.ok, false);
  return r.error!;
};

describe("resource file names", () => {
  it("strips folders and bad chars, suffixes duplicates before the extension, caps bytes keeping the extension", () => {
    assert.deepEqual(resourceFileNames(["docs/Đề 1.pdf", "Đề 1.PDF", "a\\b:c.zip", "x\u0001y.txt"], 200), ["Đề 1.pdf", "Đề 1-2.PDF", "b_c.zip", "x_y.txt"]);
    const [long] = resourceFileNames([`${"đ".repeat(300)}.mp4`], 50);
    assert.ok(long!.endsWith(".mp4") && Buffer.byteLength(long!) <= 50);
  });
});

describe("question file names", () => {
  it("reads Q<number>.webp case-insensitively, ignoring a folder prefix", () => {
    assert.equal(questionNumberOf("Q1.webp"), 1);
    assert.equal(questionNumberOf("q12.WEBP"), 12);
    assert.equal(questionNumberOf("images/Q3.webp"), 3);
    assert.equal(questionNumberOf("images\\Q4.webp"), 4);
  });
  it("rejects other names, other extensions and Q0", () => {
    for (const bad of ["Q1.png", "Q.webp", "Q0.webp", "1.webp", "Q1a.webp", "Q-1.webp", "QQ1.webp", "Q1.webp.exe"]) assert.equal(questionNumberOf(bad), null, bad);
  });
});

describe("number planning", () => {
  it("new exam: numbers come from the names, not the upload order, and must be 1..N", () => {
    assert.deepEqual(okValue(planUploadNumbers(names(3, 1, 2), 0)), [3, 1, 2]);
    assert.match(errorOf(planUploadNumbers(names(1, 2, 4, 6), 0)), /Còn thiếu: Q3, Q5$/);
    assert.match(errorOf(planUploadNumbers(names(2), 0)), /Q1/);
  });
  it("lists wrong names and duplicates", () => {
    assert.match(errorOf(planUploadNumbers(["Q1.webp", "a.png", "Q2.jpg"], 0)), /a\.png, Q2\.jpg/);
    assert.match(errorOf(planUploadNumbers(["Q1.webp", "q1.webp", "Q2.webp"], 0)), /cùng một câu: Q1$/);
  });
  it("update: replaces existing numbers and appends contiguously after the current max", () => {
    assert.deepEqual(okValue(planUploadNumbers(names(2, 5), 5)), [2, 5]); // chỉ thay
    assert.deepEqual(okValue(planUploadNumbers(names(5, 6, 7), 5)), [5, 6, 7]); // thay 5, thêm 6-7
    assert.match(errorOf(planUploadNumbers(names(6, 8), 5)), /nối tiếp từ Q6.*Còn thiếu: Q7$/);
    assert.match(errorOf(planUploadNumbers(names(7), 5)), /Còn thiếu: Q6$/);
  });
  it("truncates a long list of offending names", () => {
    const err = errorOf(planUploadNumbers(Array.from({ length: 15 }, (_, i) => `x${i}.webp`), 0));
    assert.match(err, /\.\.\. \(15\)$/);
  });
});

describe("ans.json parsing", () => {
  it("normalises letters to the stored syntax (sorted, unique, space separated)", () => {
    const { answers, ignored } = okValue(parseAnswersJson(JSON.stringify({ "Q1.webp": ["B"], "Q2.webp": ["c", "A", "C"], "q3.webp": [] }), [1, 2, 3]));
    assert.deepEqual([...answers], [
      [1, "B"],
      [2, "A C"],
    ]); // mảng rỗng = chưa biết đáp án
    assert.deepEqual(ignored, []);
  });
  it("ignores keys that are not images of this upload", () => {
    const { answers, ignored } = okValue(parseAnswersJson(JSON.stringify({ "Q1.webp": ["A"], "Q9.webp": ["B"], "note": "x" }), [1, 2]));
    assert.deepEqual([...answers], [[1, "A"]]);
    assert.deepEqual(ignored, ["Q9.webp", "note"]);
  });
  it("empty or missing text = no answers; a UTF-8 BOM is accepted", () => {
    assert.equal(okValue(parseAnswersJson(undefined, [1])).answers.size, 0);
    assert.equal(okValue(parseAnswersJson("  ", [1])).answers.size, 0);
    assert.equal(okValue(parseAnswersJson('﻿{"Q1.webp":["D"]}', [1])).answers.get(1), "D");
  });
  it("rejects invalid JSON, wrong shapes and letters outside A-H, naming the key", () => {
    assert.match(errorOf(parseAnswersJson("{", [1])), /JSON/);
    assert.match(errorOf(parseAnswersJson("[]", [1])), /dạng/);
    assert.match(errorOf(parseAnswersJson('{"Q1.webp":["I"]}', [1])), /Q1\.webp/);
    assert.match(errorOf(parseAnswersJson('{"Q1.webp":"A"}', [1])), /Q1\.webp/);
    assert.match(errorOf(parseAnswersJson('{"Q1.webp":["AB"]}', [1])), /Q1\.webp/);
    assert.match(errorOf(parseAnswersJson('{"Q1.webp":[1]}', [1])), /Q1\.webp/);
    assert.match(errorOf(parseAnswersJson('{"Q1.webp":["A"],"q1.webp":["B"]}', [1])), /hai mục cho câu Q1/);
  });
});

describe("exam gap classification", () => {
  const full = { totalQuestions: 3, questions: 3, hasFiles: false, graded: 3, filled: 3, answerSource: "MANUAL" };
  it("complete exam with real answers has no gap", () => {
    assert.equal(classifyExamGap(full), null);
    assert.equal(classifyExamGap({ ...full, answerSource: "AI" }), null);
  });
  it("no_images: fewer questions than announced, or 0 questions and no files", () => {
    assert.equal(classifyExamGap({ ...full, questions: 2 }), "no_images");
    assert.equal(classifyExamGap({ ...full, totalQuestions: 0, questions: 0, graded: 0, filled: 0 }), "no_images");
    assert.equal(classifyExamGap({ ...full, totalQuestions: 0, questions: 0, graded: 0, filled: 0, hasFiles: true }), null); // đề chỉ có tệp
  });
  it("no_answers: not AI/MANUAL, or any gradable question still blank; references do not count", () => {
    for (const s of ["DEFAULT", "PENDING", "FAILED"]) assert.equal(classifyExamGap({ ...full, answerSource: s }), "no_answers", s);
    assert.equal(classifyExamGap({ ...full, filled: 2 }), "no_answers");
    assert.equal(classifyExamGap({ ...full, graded: 2, filled: 2 }), null); // câu thứ 3 là tài liệu tham khảo
  });
});

describe("admin upload single-flight", () => {
  it("one guard shared by create and update: a second upload of the same admin on the other route gets 409", async () => {
    const pending: Array<() => void> = [];
    const app = express();
    app.use((req, _res, next) => {
      req.user = { id: req.header("x-user") } as unknown as NonNullable<typeof req.user>;
      next();
    });
    const hold: express.RequestHandler = (_req, res) => void pending.push(() => res.json({ ok: true }));
    app.post("/upload", oneExamUploadPerAdmin, hold);
    app.post("/images", oneExamUploadPerAdmin, hold);
    app.use(errorHandler);
    const server = http.createServer(app);
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const port = (server.address() as AddressInfo).port;
    const post = (p: string, user: string) => fetch(`http://127.0.0.1:${port}${p}`, { method: "POST", headers: { "x-user": user } });
    try {
      const first = post("/upload", "a");
      while (pending.length < 1) await new Promise((r) => setTimeout(r, 5));
      assert.equal((await post("/images", "a")).status, 409);
      const other = post("/images", "b");
      while (pending.length < 2) await new Promise((r) => setTimeout(r, 5));
      pending.splice(0).forEach((f) => f());
      assert.equal((await first).status, 200);
      assert.equal((await other).status, 200);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});
