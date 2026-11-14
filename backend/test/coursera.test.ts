import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { after, before, describe, it } from "node:test";
import { encryptCourseraPassword, decryptCourseraPassword } from "../src/utils/coursera-credentials";
import { courseraCourseBody, courseraOrderBody } from "../src/rules/requests/coursera.request";

describe("Coursera credentials and validation", () => {
  const previous = process.env.COURSERA_ENCRYPTION_KEY;
  before(() => { process.env.COURSERA_ENCRYPTION_KEY = randomBytes(32).toString("hex"); });
  after(() => { if (previous === undefined) delete process.env.COURSERA_ENCRYPTION_KEY; else process.env.COURSERA_ENCRYPTION_KEY = previous; });
  it("preserves password whitespace and Unicode, with randomized ciphertext", () => {
    const password = "  mật khẩu thử nghiệm  ";
    const first = encryptCourseraPassword(password);
    assert.notEqual(first, encryptCourseraPassword(password));
    assert.equal(first.includes(password), false);
    assert.equal(decryptCourseraPassword(first), password);
  });
  it("rejects tampered data and missing keys without exposing credentials", () => {
    const value = encryptCourseraPassword("private-value");
    const parts = value.split(".");
    const ciphertext = Buffer.from(parts[3]!, "base64");
    ciphertext[0] = ciphertext[0]! ^ 1;
    parts[3] = ciphertext.toString("base64");
    assert.throws(() => decryptCourseraPassword(parts.join(".")), /Không thể đọc/);
    const key = process.env.COURSERA_ENCRYPTION_KEY;
    delete process.env.COURSERA_ENCRYPTION_KEY;
    assert.throws(() => encryptCourseraPassword("private-value"), /chưa sẵn sàng/);
    process.env.COURSERA_ENCRYPTION_KEY = key;
  });
  it("accepts Coursera HTTPS URLs and rejects invalid or deceptive URLs", () => {
    for (const url of ["https://www.coursera.org/learn/example", "https://coursera.org/specializations/example"]) {
      assert.equal(courseraCourseBody.safeParse({ title: "Course", url }).success, true);
    }
    for (const url of ["invalid", "javascript:alert(1)", "http://coursera.org/learn/example", "https://coursera.org.evil.invalid/", "https://user:pass@coursera.org/", "https://coursera.org:444/"]) {
      assert.equal(courseraCourseBody.safeParse({ title: "Course", url }).success, false);
    }
  });
  it("validates order fields without trimming the account password", () => {
    const body = { courseId: 1, requestKey: "d04d43e4-aeac-4ccb-9ec3-34ea25be01ab", email: "test@example.invalid", password: " secret ", note: " Note " };
    assert.equal(courseraOrderBody.parse(body).password, " secret ");
    for (const invalid of [{ password: "" }, { email: "invalid" }, { courseId: -1 }, { requestKey: "invalid" }, { note: "x".repeat(2001) }]) {
      assert.equal(courseraOrderBody.safeParse({ ...body, ...invalid }).success, false);
    }
  });
});
