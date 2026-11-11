import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bufferToVector, cosine, DimensionMismatchError, dot, dotF32, fromBytes, normalize, toBytes, topK, vectorToBuffer } from "../src/utils/vector";

const f = (...xs: number[]) => new Float32Array(xs);
const close = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);

describe("vector utils", () => {
  it("cosine of identical vectors is 1", () => close(cosine(f(1, 2, 3), f(1, 2, 3)), 1));
  it("cosine of orthogonal vectors is 0", () => close(cosine(f(1, 0, 0), f(0, 5, 0)), 0));
  it("cosine of opposite vectors is -1", () => close(cosine(f(1, -2, 3), f(-2, 4, -6)), -1));

  it("zero vectors never produce NaN", () => {
    assert.equal(cosine(f(0, 0, 0), f(1, 2, 3)), 0);
    assert.equal(cosine(f(0, 0), f(0, 0)), 0);
    const n = normalize(f(0, 0, 0));
    assert.deepEqual([...n], [0, 0, 0]);
    assert.ok([...n].every(Number.isFinite));
  });

  it("normalize gives unit length and keeps direction", () => {
    const n = normalize(f(3, 4));
    close(n[0]!, 0.6);
    close(n[1]!, 0.8);
    close(dotF32(n, n), 1);
  });

  it("dimension mismatch throws a clear error", () => {
    assert.throws(() => cosine(f(1, 2), f(1, 2, 3)), (e: unknown) => e instanceof DimensionMismatchError && /expected 2, got 3/.test(e.message));
    assert.throws(() => dot(f(1), f(1, 2)), DimensionMismatchError);
    assert.throws(() => bufferToVector(vectorToBuffer(f(1, 2)), 3), DimensionMismatchError);
  });

  it("Buffer round-trip keeps every float32 exactly", () => {
    const v = f(0.1, -2.5, 3.4028234663852886e38, -0, 1e-20);
    const back = bufferToVector(vectorToBuffer(v), v.length);
    assert.deepEqual([...back], [...v]);
    // subarray view: only the viewed part is written
    const sub = f(9, 1, 2, 9).subarray(1, 3);
    assert.deepEqual([...bufferToVector(vectorToBuffer(sub))], [1, 2]);
    assert.throws(() => bufferToVector(new Uint8Array(5)), /multiple of 4/);
  });

  it("existing toBytes/fromBytes/dotF32 behave as before", () => {
    const b = toBytes([1, 2, 3]);
    assert.equal(b.byteLength, 12);
    assert.deepEqual([...fromBytes(b)], [1, 2, 3]);
    assert.equal(dotF32(f(1, 2), f(3, 4)), 11);
  });

  it("topK orders by cosine desc, keeps input order on ties, respects k", () => {
    const q = f(1, 0);
    const cands = [
      { id: "far", vector: f(-1, 0) },
      { id: "tieA", vector: f(1, 1) },
      { id: "best", vector: f(2, 0) },
      { id: "tieB", vector: f(1, -1) },
      { id: "zero", vector: f(0, 0) },
    ];
    assert.deepEqual(
      topK(q, cands, 4).map((s) => s.id),
      ["best", "tieA", "tieB", "zero"],
    );
    assert.equal(topK(q, cands, 0).length, 0);
    assert.equal(topK(q, cands, 99).length, 5);
    close(topK(q, cands, 1)[0]!.score, 1);
  });
});
