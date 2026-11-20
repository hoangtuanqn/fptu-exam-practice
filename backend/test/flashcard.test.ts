import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkFlashcardSet, flashcardRel, isFlashcardStaticPath } from "../src/utils/flashcard";

const names = (n: number) => Array.from({ length: n }, (_, i) => `Q${i + 1}.webp`);

describe("checkFlashcardSet", () => {
  it("maps answers[i] to question i+1 and joins multiple letters with spaces", () => {
    const r = checkFlashcardSet(names(3), [["A", "B", "D"], ["a"], ["C"]]);
    assert.ok(r.ok);
    assert.deepEqual(r.set.cards, [{ number: 1, answer: "A B D" }, { number: 2, answer: "A" }, { number: 3, answer: "C" }]);
  });

  it("rejects missing images, images without answers, bad names and bad letters", () => {
    const missing = checkFlashcardSet(["Q1.webp", "Q3.webp"], [["A"], ["B"], ["C"]]);
    assert.ok(!missing.ok && missing.errors.some((e) => e.includes("Thiếu ảnh")));
    const extra = checkFlashcardSet(names(3), [["A"], ["B"]]);
    assert.ok(!extra.ok && extra.errors.some((e) => e.includes("không có đáp án")));
    const badName = checkFlashcardSet([...names(1), "cau2.webp"], [["A"]]);
    assert.ok(!badName.ok && badName.errors.some((e) => e.includes("sai dạng")));
    for (const bad of [[[]], [["Z"]], [["A", "A"]], [["AB"]]]) assert.ok(!checkFlashcardSet(names(1), bad).ok);
    assert.ok(!checkFlashcardSet(names(1), { 0: ["A"] }).ok);
  });
});

describe("flashcard files", () => {
  it("builds the signed relative path", () => {
    assert.equal(flashcardRel("pro192", 10), "flashcards/PRO192/Q10.webp");
  });

  it("blocks flashcards/ from static serving however it is written", () => {
    for (const p of ["/flashcards/PRO192/Q1.webp", "/FlashCards/PRO192/Q1.webp", "/%66lashcards/PRO192/Q1.webp", "/avatars/../flashcards/PRO192/Q1.webp", "/flashcards", "/%E0%A4%A"]) assert.ok(isFlashcardStaticPath(p), p);
    for (const p of ["/avatars/a.png", "/exams/1/images/Q1.webp", "/flashcardsx/a.png"]) assert.ok(!isFlashcardStaticPath(p), p);
  });
});
