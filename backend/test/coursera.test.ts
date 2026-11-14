import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { courseraCourseBody, courseraOrderBody } from "../src/rules/requests/coursera.request";

describe("Coursera validation", () => {
  it("accepts an optional code and URL, storing blanks as null", () => {
    assert.deepEqual(courseraCourseBody.parse({ title: "Course", code: " CSE101 " }), { title: "Course", code: "CSE101", isActive: true });
    const blank = courseraCourseBody.parse({ title: "Course", code: "", url: "  " });
    assert.equal(blank.code, null);
    assert.equal(blank.url, null);
    assert.equal(courseraCourseBody.safeParse({ title: "Course", code: "x".repeat(33) }).success, false);
  });
  it("accepts Coursera HTTPS URLs and rejects invalid or deceptive URLs", () => {
    for (const url of ["https://www.coursera.org/learn/example", "https://coursera.org/specializations/example"]) {
      assert.equal(courseraCourseBody.safeParse({ title: "Course", url }).success, true);
    }
    for (const url of ["invalid", "javascript:alert(1)", "http://coursera.org/learn/example", "https://coursera.org.evil.invalid/", "https://user:pass@coursera.org/", "https://coursera.org:444/"]) {
      assert.equal(courseraCourseBody.safeParse({ title: "Course", url }).success, false);
    }
  });
  it("rejects invalid prices and defaults older clients to a zero-price quote", () => {
    const course = { title: "Course", url: "https://www.coursera.org/learn/example" };
    for (const price of [-1, 0.5, 100_000_001, "100", Infinity]) {
      assert.equal(courseraCourseBody.safeParse({ ...course, price }).success, false);
    }
    assert.equal(courseraCourseBody.parse({ ...course, price: 25000 }).price, 25000);
    const order = { courseId: 1, requestKey: "d04d43e4-aeac-4ccb-9ec3-34ea25be01ab", email: "test@example.invalid", password: "test" };
    assert.equal(courseraOrderBody.parse(order).expectedPrice, 0);
    assert.equal(courseraOrderBody.safeParse({ ...order, expectedPrice: -1 }).success, false);
  });
  it("validates order fields without trimming the account password", () => {
    const body = { courseId: 1, requestKey: "d04d43e4-aeac-4ccb-9ec3-34ea25be01ab", email: "test@example.invalid", password: " secret ", note: " Note " };
    assert.equal(courseraOrderBody.parse(body).password, " secret ");
    for (const invalid of [{ password: "" }, { email: "invalid" }, { courseId: -1 }, { requestKey: "invalid" }, { note: "x".repeat(2001) }]) {
      assert.equal(courseraOrderBody.safeParse({ ...body, ...invalid }).success, false);
    }
  });
});
