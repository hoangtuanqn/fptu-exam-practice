import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FINGERPRINT_MODEL, groupThresholdFor } from "../src/constants/similarity";
import { fingerprintToVector } from "../src/services/embedding/fingerprint.provider";
import { clusterQuestions, type ClusterRow } from "../src/utils/question-clustering";
import { normalize } from "../src/utils/vector";
import { flipBits, randomHash } from "./helpers/fingerprints";

const THRESHOLD = groupThresholdFor(FINGERPRINT_MODEL); // 6 bit
const opts = { threshold: THRESHOLD, sameChapterOnly: true, allowSameExam: false };
const row = (questionId: number, examId: number, chapter: string | null, hash: Uint8Array): ClusterRow => ({ questionId, examId, chapter, vector: fingerprintToVector(hash)! });

const base = randomHash(10);
const other = randomHash(11);
const pair = randomHash(12);

// 3 câu gần giống ở 3 đề khác nhau, 2 câu gần giống trong CÙNG một đề, 1 câu khác hẳn
const fixture: ClusterRow[] = [
  row(1, 100, "Ch1", base),
  row(2, 200, "Ch1", flipBits(base, [3])),
  row(3, 300, "Ch1", flipBits(base, [3, 500])),
  row(4, 400, "Ch2", pair),
  row(5, 400, "Ch2", flipBits(pair, [1])),
  row(6, 500, "Ch1", other),
];

describe("clusterQuestions (pure)", () => {
  it("groups near-duplicates across exams, keeps same-exam twins and distant questions apart", () => {
    const r = clusterQuestions(fixture, opts);
    assert.deepEqual(r.groups, [[1, 2, 3]]);
  });

  it("is deterministic regardless of input order", () => {
    const a = clusterQuestions(fixture, opts);
    const b = clusterQuestions([...fixture].reverse(), opts);
    assert.deepEqual(a.groups, b.groups);
    assert.deepEqual(clusterQuestions(fixture, opts), a);
  });

  it("allowSameExam lets same-exam twins merge", () => {
    assert.deepEqual(clusterQuestions(fixture, { ...opts, allowSameExam: true }).groups, [[1, 2, 3], [4, 5]]);
  });

  it("sameChapterOnly keeps a duplicate with another chapter (or null chapter) out", () => {
    const rows = [...fixture, row(7, 600, null, flipBits(base, [9])), row(8, 700, "Ch9", flipBits(base, [10]))];
    assert.deepEqual(clusterQuestions(rows, opts).groups, [[1, 2, 3]]);
    assert.deepEqual(clusterQuestions(rows, { ...opts, sameChapterOnly: false }).groups, [[1, 2, 3, 7, 8]]);
  });

  it("null chapters are compared among themselves", () => {
    const rows = [row(1, 1, null, base), row(2, 2, null, flipBits(base, [1])), row(3, 3, "Ch1", base)];
    assert.deepEqual(clusterQuestions(rows, opts).groups, [[1, 2]]);
  });

  it("chain a~b~c with a,c in the same exam: strongest link wins, c stays out", () => {
    // a (exam 1) ~ b (exam 2) distance 1; b ~ c (exam 1) distance 4; a ~ c distance 5
    const a = base;
    const b = flipBits(base, [0]);
    const c = flipBits(base, [0, 20, 21, 22, 23]);
    const rows = [row(1, 1, "X", a), row(2, 2, "X", b), row(3, 1, "X", c)];
    const r = clusterQuestions(rows, opts);
    assert.deepEqual(r.groups, [[1, 2]]);
    for (const g of r.groups) assert.equal(new Set(g.map((id) => rows.find((x) => x.questionId === id)!.examId)).size, g.length);
  });

  it("borderline pairs are reported only when a margin is given, closest to threshold first", () => {
    const near = [row(1, 1, "X", base), row(2, 2, "X", flipBits(base, [1, 2, 3, 4, 5, 6, 7]))]; // 7 bit: just under the threshold
    assert.equal(clusterQuestions(near, opts).borderline.length, 0);
    const r = clusterQuestions(near, { ...opts, borderlineMargin: 0.05 });
    assert.equal(r.groups.length, 0);
    assert.equal(r.borderline.length, 1);
    assert.ok(Math.abs(r.borderline[0]!.score - (1 - 14 / 1536)) < 1e-5);
  });

  it("works with plain text-style vectors and the 0.90 default", () => {
    const v = (...xs: number[]) => normalize(new Float32Array(xs));
    const rows: ClusterRow[] = [
      { questionId: 1, examId: 1, chapter: "A", vector: v(1, 0.1, 0) },
      { questionId: 2, examId: 2, chapter: "A", vector: v(1, 0.2, 0) },
      { questionId: 3, examId: 3, chapter: "A", vector: v(0, 1, 0) },
    ];
    assert.deepEqual(clusterQuestions(rows, { ...opts, threshold: 0.9 }).groups, [[1, 2]]);
  });
});
