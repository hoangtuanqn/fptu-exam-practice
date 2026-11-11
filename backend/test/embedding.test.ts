import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FINGERPRINT_BITS, FINGERPRINT_MODEL, fingerprintThresholdForBits, groupThresholdFor } from "../src/constants/similarity";
import { FREQUENT_MATCH_BITS } from "../src/constants/frequent";
import { FakeEmbeddingProvider, FingerprintEmbeddingProvider, providerFor, TextEmbeddingProvider } from "../src/services/embedding";
import { hammingWithin, toWords } from "../src/utils/question-hash";
import { cosine, dotF32 } from "../src/utils/vector";
import { flipBits, randomHash } from "./helpers/fingerprints";

describe("FingerprintEmbeddingProvider", () => {
  const p = new FingerprintEmbeddingProvider();

  it("gives unit vectors with cosine = 1 - 2 * hamming / 1536 (matches question-hash)", async () => {
    const a = randomHash(1);
    const b = flipBits(a, [0, 7, 100, 1535, 800]);
    const c = randomHash(2);
    const [va, vb, vc] = await p.embed([a, b, c].map((imageHash, id) => ({ id, text: null, imageHash })));
    assert.equal(va!.length, FINGERPRINT_BITS);
    assert.ok(Math.abs(dotF32(va!, va!) - 1) < 1e-5);
    for (const [x, y, hx, hy] of [[va!, vb!, a, b] as const, [va!, vc!, a, c] as const]) {
      const h = hammingWithin(toWords(hx), toWords(hy), FINGERPRINT_BITS);
      assert.ok(Math.abs(cosine(x, y) - (1 - (2 * h) / FINGERPRINT_BITS)) < 1e-5);
    }
  });

  it("returns null for questions without a fingerprint or with a wrong length", async () => {
    const out = await p.embed([
      { id: 1, text: "ignored", imageHash: null },
      { id: 2, text: null, imageHash: new Uint8Array(10) },
    ]);
    assert.deepEqual(out, [null, null]);
  });

  it("default threshold matches FREQUENT_MATCH_BITS of the existing frequent-questions service", () => {
    assert.equal(groupThresholdFor(FINGERPRINT_MODEL), fingerprintThresholdForBits(FREQUENT_MATCH_BITS));
    assert.equal(fingerprintThresholdForBits(6), 0.9921875);
    assert.equal(groupThresholdFor("some-text-model"), 0.9);
    assert.equal(providerFor(FINGERPRINT_MODEL).modelName, FINGERPRINT_MODEL);
    assert.throws(() => providerFor("nope"), /Unknown embedding model/);
  });
});

describe("FakeEmbeddingProvider", () => {
  it("is deterministic and similar text scores higher than different text", async () => {
    const p = new FakeEmbeddingProvider(64);
    const [a, a2, b, c, none] = await p.embed([
      { id: 1, text: "what is the time complexity of quick sort", imageHash: null },
      { id: 2, text: "what is the time complexity of quick sort", imageHash: null },
      { id: 3, text: "what is the time complexity of merge sort", imageHash: null },
      { id: 4, text: "which protocol does http use", imageHash: null },
      { id: 5, text: null, imageHash: null },
    ]);
    assert.deepEqual([...a!], [...a2!]);
    assert.ok(cosine(a!, b!) > cosine(a!, c!));
    assert.equal(none, null);
  });
});

describe("TextEmbeddingProvider stub", () => {
  it("throws not configured", async () => {
    await assert.rejects(new TextEmbeddingProvider().embed([{ id: 1, text: "x", imageHash: null }]), /not configured/);
  });
});
