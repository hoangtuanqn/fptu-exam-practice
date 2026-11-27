// Self-check for the comment formatting toolbar. Run: node scripts/check-comment-format.mjs
import assert from "node:assert/strict";
import { applyFormat } from "../src/features/exam-comments/format.ts";

const run = (value, start, end, format) => {
  const r = applyFormat(value, start, end, format);
  return [r.value, r.value.slice(r.start, r.end)];
};

assert.deepEqual(run("ab cd", 3, 5, "bold"), ["ab **cd**", "cd"]);
assert.deepEqual(run("", 0, 0, "italic"), ["*chữ nghiêng*", "chữ nghiêng"]);
assert.deepEqual(run("x", 0, 1, "spoiler"), ["||x||", "x"]);
assert.deepEqual(run("xem", 0, 3, "link"), ["[xem](https://)", "https://"]);
assert.deepEqual(run("a\nb\nc", 2, 5, "number"), ["a\n1. b\n2. c", ""]);
assert.deepEqual(run("a\nb", 3, 3, "quote"), ["a\n> b", ""]);
assert.deepEqual(run("a", 1, 1, "bullet"), ["- a", ""]);
assert.equal(run("a", 1, 1, "table")[0], "a\n| Cột 1 | Cột 2 |\n| --- | --- |\n| ô | ô |\n");
assert.deepEqual(run("x=1", 0, 3, "codeblock"), ["```\nx=1\n```\n", "x=1"]);

console.log("check-comment-format: ok");
