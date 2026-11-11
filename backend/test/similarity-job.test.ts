import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { SubjectRef } from "../src/repositories/subject.repository";
import { createSimilarityJob, type HashOutcome, type SimilarityJobDeps, type SubjectEntry } from "../src/services/similarity-job.service";
import { EMPTY_EXAM_AGGREGATE, examSignature, examsChanged, hashCursorFor, needsWork, splitHashBudget, type SubjectSnapshot } from "../src/utils/similarity-job";

const NONE = { missingHashes: 0, unembedded: 0 };
const snap = (signature: string, lastRun: SubjectSnapshot["lastRun"], hasUsableExams = true): SubjectSnapshot => ({ signature, hasUsableExams, lastRun });

describe("similarity job selection (pure)", () => {
  it("exam signature changes when an exam is added, solved, removed or refreshed", () => {
    const base = { count: 2, idSum: 3, maxCreatedAt: new Date(1000), maxRefreshedAt: null };
    const sig = examSignature(base);
    assert.equal(examSignature({ ...base }), sig);
    assert.notEqual(examSignature({ ...base, count: 3, idSum: 7 }), sig); // đề mới / đề DEFAULT vừa được giải
    assert.notEqual(examSignature({ ...base, idSum: 4 }), sig); // một đề bị thay bằng đề khác
    assert.notEqual(examSignature({ ...base, maxRefreshedAt: new Date(2000) }), sig);
    assert.equal(examSignature(EMPTY_EXAM_AGGREGATE), "0:0:0:0");
  });

  it("selects subjects whose exams changed, that still miss hashes, or have unembedded questions", () => {
    assert.equal(needsWork(snap("a", null), NONE), true); // chưa chạy lần nào
    assert.equal(needsWork(snap("0:0:0:0", null, false), NONE), false); // chưa có đề dùng được
    assert.equal(needsWork(snap("a", { signature: "a", hashCursor: 5 }), NONE), false); // không đổi gì
    assert.equal(needsWork(snap("b", { signature: "a", hashCursor: 5 }), NONE), true); // đề đổi
    assert.equal(needsWork(snap("a", { signature: "a", hashCursor: 5 }), { missingHashes: 1, unembedded: 0 }), true); // đêm trước hết trần
    assert.equal(needsWork(snap("a", { signature: "a", hashCursor: 5 }), { missingHashes: 0, unembedded: 2 }), true); // "Câu hay ra" vừa tính
    assert.equal(needsWork(snap("0:0:0:0", { signature: "1:5:1:0", hashCursor: 5 }, false), NONE), true); // mọi đề bị gỡ: dọn nhóm cũ
    assert.equal(needsWork(snap("a", { signature: "a", hashCursor: 5 }), NONE, true), true); // --force
  });

  it("hash cursor resumes after the last attempt, and restarts from 0 when exams changed or forced", () => {
    assert.equal(hashCursorFor(snap("a", { signature: "a", hashCursor: 42 })), 42);
    assert.equal(hashCursorFor(snap("b", { signature: "a", hashCursor: 42 })), 0);
    assert.equal(hashCursorFor(snap("a", null)), 0);
    assert.equal(hashCursorFor(snap("a", { signature: "a", hashCursor: 42 }), true), 0);
    assert.equal(examsChanged(snap("a", { signature: "a", hashCursor: 0 })), false);
  });

  it("splits the hash budget: small subjects finish, the rest is shared, total never exceeded", () => {
    const needs = [
      { id: 1, missing: 10 },
      { id: 2, missing: 1000 },
      { id: 3, missing: 0 },
      { id: 4, missing: 1000 },
    ];
    const b = splitHashBudget(needs, 210);
    assert.deepEqual([...b.entries()].sort((x, y) => x[0] - y[0]), [
      [1, 10],
      [2, 100],
      [3, 0],
      [4, 100],
    ]);
    const odd = splitHashBudget([{ id: 1, missing: 50 }, { id: 2, missing: 50 }, { id: 3, missing: 50 }], 100);
    assert.equal([...odd.values()].reduce((s, v) => s + v, 0), 100);
    assert.deepEqual([...splitHashBudget(needs, 5000).values()], [10, 1000, 0, 1000]); // đủ chỗ thì môn nào cũng nhận đủ
    assert.deepEqual([...splitHashBudget(needs, 0).values()], [0, 0, 0, 0]);
    assert.equal([...splitHashBudget(needs, 2).values()].reduce((s, v) => s + v, 0), 2);
  });
});

// Môn giả: missing = số ảnh chưa tính sau con trỏ; hash tính được tất cả trừ id trong `unreadable`
interface FakeSubject {
  subject: SubjectRef;
  signature: string;
  lastRun: SubjectEntry["lastRun"];
  missingIds: number[];
  unembedded: number;
  fail?: boolean;
}

function fakeDeps(subjects: FakeSubject[], unreadable = new Set<number>()) {
  const saved: { subjectId: number; signature: string; hashCursor: number }[] = [];
  const notices: { codes: readonly string[]; eligible: number }[] = [];
  const pipelineCalls: string[] = [];
  const hashLimits = new Map<string, number>();
  const deps: SimilarityJobDeps = {
    async loadSubjects() {
      return subjects.map((s) => ({ subject: s.subject, signature: s.signature, hasUsableExams: true, lastRun: s.lastRun }));
    },
    async countWork(subject, after) {
      const s = subjects.find((x) => x.subject.id === subject.id)!;
      return { missingHashes: s.missingIds.filter((id) => id > after).length, unembedded: s.unembedded };
    },
    async hashMissing(subject, after, limit): Promise<HashOutcome> {
      hashLimits.set(subject.code, limit);
      const s = subjects.find((x) => x.subject.id === subject.id)!;
      const batch = s.missingIds.filter((id) => id > after).slice(0, limit);
      const ok = batch.filter((id) => !unreadable.has(id));
      s.missingIds = s.missingIds.filter((id) => !ok.includes(id));
      return { attempted: batch.length, hashed: ok.length, lastId: batch.at(-1) ?? null };
    },
    async pipeline(subject) {
      pipelineCalls.push(subject.code);
      const s = subjects.find((x) => x.subject.id === subject.id)!;
      if (s.fail) throw new Error("boom");
      s.unembedded = 0;
      return { embedded: 1, groups: 2 };
    },
    async saveRun(subjectId, signature, hashCursor) {
      saved.push({ subjectId, signature, hashCursor });
      const s = subjects.find((x) => x.subject.id === subjectId)!;
      s.lastRun = { signature, hashCursor };
    },
    notifyFailures(codes, eligible) {
      notices.push({ codes, eligible });
    },
  };
  return { deps, saved, notices, pipelineCalls, hashLimits };
}

const subj = (id: number, code: string): SubjectRef => ({ id, code, name: code });
const range = (from: number, n: number) => Array.from({ length: n }, (_, i) => from + i);

describe("similarity job run (fake dependencies)", () => {
  it("one failing subject does not stop the others and produces a single notice", async () => {
    const f = fakeDeps([
      { subject: subj(1, "AAA"), signature: "s1", lastRun: null, missingIds: [], unembedded: 0 },
      { subject: subj(2, "BBB"), signature: "s2", lastRun: null, missingIds: [], unembedded: 0, fail: true },
      { subject: subj(3, "CCC"), signature: "s3", lastRun: null, missingIds: [], unembedded: 0 },
      { subject: subj(4, "DDD"), signature: "s4", lastRun: { signature: "s4", hashCursor: 0 }, missingIds: [], unembedded: 0 },
    ]);
    const r = (await createSimilarityJob(f.deps)({ maxHashes: 100 }))!;
    assert.deepEqual(f.pipelineCalls, ["AAA", "BBB", "CCC"]); // DDD không đổi gì
    assert.equal(r.subjects, 4);
    assert.equal(r.eligible, 3);
    assert.equal(r.processed, 2);
    assert.equal(r.failed, 1);
    assert.deepEqual(f.saved.map((s) => s.subjectId), [1, 3]); // môn lỗi không ghi mốc: đêm sau thử lại
    assert.deepEqual(f.notices, [{ codes: ["BBB"], eligible: 3 }]);
  });

  it("a hash-limited subject stays eligible and finishes over several nights; a rerun with nothing left does no work", async () => {
    const f = fakeDeps(
      [
        { subject: subj(1, "BIG"), signature: "s1", lastRun: null, missingIds: range(100, 30), unembedded: 0 },
        { subject: subj(2, "SML"), signature: "s2", lastRun: null, missingIds: range(500, 3), unembedded: 0 },
      ],
      new Set([101]), // một ảnh không đọc được
    );
    const run = createSimilarityJob(f.deps);
    const n1 = (await run({ maxHashes: 13 }))!;
    assert.deepEqual(Object.fromEntries(f.hashLimits), { SML: 3, BIG: 10 }); // môn nhỏ nhận đủ, môn lớn phần còn lại
    assert.equal(n1.imagesHashed, 12);
    assert.equal(n1.imagesUnreadable, 1);
    assert.equal(n1.hashLimited, 1);
    assert.equal(f.saved.find((s) => s.subjectId === 1)!.hashCursor, 109);

    const n2 = (await run({ maxHashes: 13 }))!;
    assert.equal(n2.eligible, 1); // chỉ BIG còn ảnh
    assert.equal(n2.imagesHashed, 13);
    const n3 = (await run({ maxHashes: 13 }))!;
    assert.equal(n3.imagesHashed, 7);
    assert.equal(n3.hashLimited, 0);

    const n4 = (await run({ maxHashes: 13 }))!;
    assert.equal(n4.eligible, 0); // ảnh 101 hỏng nằm sau con trỏ nên không bị thử lại mỗi đêm
    assert.equal(n4.imagesHashed + n4.processed, 0);
  });

  it("does not start a second run while one is in progress", async () => {
    let release: () => void = () => undefined;
    const gate = new Promise<void>((r) => (release = r));
    const f = fakeDeps([{ subject: subj(1, "AAA"), signature: "s1", lastRun: null, missingIds: [], unembedded: 0 }]);
    const slow: SimilarityJobDeps = { ...f.deps, pipeline: async (s) => (await gate, f.deps.pipeline(s)) };
    const run = createSimilarityJob(slow);
    const first = run();
    assert.equal(await run(), null);
    release();
    assert.equal((await first)!.processed, 1);
    assert.equal((await run())!.eligible, 0); // cờ được trả lại sau lượt đầu
  });
});
