import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fsrsReviewBody } from "../src/rules/requests/fsrs-review.request";
import { Rating, ratingFromResult, scheduleReview } from "../src/utils/fsrs";

const T0 = new Date("2026-01-05T08:00:00.000Z"); // đồng hồ cố định, test không đọc giờ thật
const at = (ms: number) => new Date(T0.getTime() + ms);

describe("ratingFromResult", () => {
  const th = { fast: 10, slow: 60 };
  it("maps result to rating with configurable thresholds", () => {
    assert.equal(ratingFromResult({ correct: false, seconds: 1 }, th), Rating.Again);
    assert.equal(ratingFromResult({ correct: true, seconds: 61 }, th), Rating.Hard);
    assert.equal(ratingFromResult({ correct: true, seconds: 30 }, th), Rating.Good);
    assert.equal(ratingFromResult({ correct: true, seconds: 60 }, th), Rating.Good);
    assert.equal(ratingFromResult({ correct: true, seconds: 5 }, th), Rating.Easy);
  });
});

describe("scheduleReview (ts-fsrs, fixed clock)", () => {
  it("a wrong answer is due earlier than a correct one", () => {
    const wrong = scheduleReview(null, Rating.Again, T0);
    const right = scheduleReview(null, Rating.Good, T0);
    assert.ok(wrong.card.due < right.card.due, `${wrong.card.due.toISOString()} !< ${right.card.due.toISOString()}`);
    assert.ok(wrong.card.due > T0);
    assert.equal(wrong.log.review.getTime(), T0.getTime());
  });

  it("two consecutive correct answers push the due date further out", () => {
    const first = scheduleReview(null, Rating.Good, T0);
    const second = scheduleReview(first.card, Rating.Good, first.card.due);
    const third = scheduleReview(second.card, Rating.Good, second.card.due);
    const gap1 = first.card.due.getTime() - T0.getTime();
    const gap2 = second.card.due.getTime() - first.card.due.getTime();
    const gap3 = third.card.due.getTime() - second.card.due.getTime();
    assert.ok(gap2 > gap1 && gap3 > gap2, `${gap1} ${gap2} ${gap3}`);
    assert.equal(third.card.reps, 3);
  });

  it("is deterministic for the same input", () => {
    const a = scheduleReview(null, Rating.Hard, T0);
    const b = scheduleReview(null, Rating.Hard, T0);
    assert.deepEqual(a.card, b.card);
  });

  it("a lapse on a review card counts and brings the due date back", () => {
    let card = scheduleReview(null, Rating.Good, T0).card;
    card = scheduleReview(card, Rating.Good, card.due).card;
    const reviewAt = at(30 * 86_400_000);
    const lapse = scheduleReview(card, Rating.Again, reviewAt);
    assert.equal(lapse.card.lapses, 1);
    assert.ok(lapse.card.due.getTime() - reviewAt.getTime() < 86_400_000);
  });
});

describe("POST /reviews body", () => {
  it("accepts exactly one form", () => {
    assert.ok(fsrsReviewBody.safeParse({ questionId: 1, rating: 3 }).success);
    assert.ok(fsrsReviewBody.safeParse({ questionId: 1, correct: true, seconds: 12.5 }).success);
    assert.equal(fsrsReviewBody.safeParse({ questionId: 1, rating: 3, correct: true, seconds: 1 }).success, false);
    assert.equal(fsrsReviewBody.safeParse({ questionId: 1 }).success, false);
    assert.equal(fsrsReviewBody.safeParse({ questionId: 1, rating: 0 }).success, false);
    assert.equal(fsrsReviewBody.safeParse({ questionId: 1, correct: true }).success, false);
  });
});
