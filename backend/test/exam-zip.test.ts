import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { strFromU8, unzipSync } from "fflate";
import { buildAnswerText, buildExamZip, ExamZipTooLarge, normalizeAnswer, withTrustedAnswers, type ExportQuestion } from "../src/utils/exam-zip";

const ROOT = path.resolve("fake-storage");
const IMG = new Uint8Array([1, 2, 3]);
const readFile = async (abs: string) => {
  if (abs.includes("missing")) throw new Error("ENOENT");
  return IMG;
};
const q = (number: number, answer: string | null, imagePath: string | null = `exams/1/images/q${number}.webp`): ExportQuestion => ({ number, answer, imagePath });

describe("normalizeAnswer", () => {
  it("uppercases and space-separates any stored form", () => {
    for (const raw of ["BCD", "B,C,D", "b c d", "b, c,d"]) assert.equal(normalizeAnswer(raw), "B C D");
    assert.equal(normalizeAnswer("a"), "A");
    assert.equal(normalizeAnswer(""), "");
    assert.equal(normalizeAnswer(null), "");
  });
});

describe("buildAnswerText", () => {
  it("skips unanswered questions, orders by number, formats multi-answer", () => {
    assert.equal(buildAnswerText([q(3, ""), q(2, "BCD"), q(1, "a"), q(4, null)]), "1 A\n2 B C D\n");
  });
});

describe("buildExamZip", () => {
  it("contains only images/NN.ext and dap-an/dap-an.txt", async () => {
    const qs = [q(1, "A"), q(2, "B,C"), q(10, ""), q(5, "D", null), { number: 7, answer: "C", imagePath: "exams/1/images/q7.PNG" }];
    const { zip, skipped } = await buildExamZip(qs, { root: ROOT, readFile, maxBytes: 1000 });
    const files = unzipSync(zip);
    const names = Object.keys(files).filter((n) => !n.endsWith("/")).sort();
    assert.deepEqual(names, ["dap-an/dap-an.txt", "images/01.webp", "images/02.webp", "images/07.png", "images/10.webp"]);
    assert.ok(Object.keys(files).every((n) => n.startsWith("images/") || n.startsWith("dap-an/")));
    assert.equal(strFromU8(files["dap-an/dap-an.txt"]!), "1 A\n2 B C\n5 D\n7 C\n");
    assert.deepEqual(files["images/01.webp"], IMG);
    assert.deepEqual(skipped, []);
  });

  it("skips a missing image and a path outside the storage root", async () => {
    const qs = [q(1, "A"), q(2, "B", "exams/1/images/missing.webp"), q(3, "C", "../../etc/passwd"), q(4, "D", path.resolve("/elsewhere/x.webp"))];
    const { zip, skipped } = await buildExamZip(qs, { root: ROOT, readFile, maxBytes: 1000 });
    const names = Object.keys(unzipSync(zip)).filter((n) => n.startsWith("images/") && !n.endsWith("/"));
    assert.deepEqual(names, ["images/1.webp"]);
    assert.deepEqual(skipped, [2, 3, 4]);
  });

  it("refuses when images exceed the byte cap", async () => {
    await assert.rejects(buildExamZip([q(1, "A"), q(2, "B")], { root: ROOT, readFile, maxBytes: 4 }), ExamZipTooLarge);
  });

  it("drops the placeholder answers of exams that were never solved", () => {
    const qs = [q(1, "A"), q(2, "B")];
    for (const source of ["DEFAULT", "PENDING", "FAILED"]) assert.equal(buildAnswerText(withTrustedAnswers(qs, source)), "");
    for (const source of ["AI", "MANUAL"]) assert.equal(buildAnswerText(withTrustedAnswers(qs, source)), "1 A\n2 B\n");
  });
});
