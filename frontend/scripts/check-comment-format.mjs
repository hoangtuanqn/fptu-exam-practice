// Self-check for the comment formatting toolbar. Run: node scripts/check-comment-format.mjs
import assert from "node:assert/strict";
import { applyFormat, markRefs, mentionAt } from "../src/features/exam-comments/format.ts";

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

// #12 -> liên kết câu: chỉ số có trong đề, không trong mã, không dính chữ / URL, không phải tiêu đề
const qs = new Set([1, 2, 12]);
const refs = (body, names = []) => markRefs(body, qs, names);
assert.equal(refs("xem #12 nhé"), "xem [#12](#q-12) nhé");
assert.equal(refs("#1, (#2)"), "[#1](#q-1), ([#2](#q-2))");
assert.equal(refs("#99 không có"), "#99 không có");
assert.equal(refs("C#12 a#1 #12a #12ă"), "C#12 a#1 #12a #12ă");
assert.equal(refs("https://x.com/#12 và x.com?a=1#2"), "https://x.com/#12 và x.com?a=1#2");
assert.equal(refs("# 12 tiêu đề\n## #1"), "# 12 tiêu đề\n## [#1](#q-1)");
assert.equal(refs("`#12` và #12"), "`#12` và [#12](#q-12)");
assert.equal(refs("```\n#12\n```\n#1"), "```\n#12\n```\n[#1](#q-1)");
assert.equal(refs("```\n#12 chưa đóng"), "```\n#12 chưa đóng");
assert.equal(refs("[#12](https://a)"), "[#12](https://a)");
// @Tên -> đậm: tên dài trước, không dính chữ, không trong mã, ký tự Markdown trong tên được thoát
assert.equal(refs("@An Nhiên và @An", ["An", "An Nhiên"]), "[@An Nhiên](#mention) và [@An](#mention)");
assert.equal(refs("mail x@An @Anh `@An`", ["An"]), "mail x@An @Anh `@An`");
assert.equal(refs("hi @a_b*", ["a_b*"]), "hi [@a\\_b\\*](#mention)");
assert.equal(refs("@An #12", ["An"]), "[@An](#mention) [#12](#q-12)");
// Đang gõ @... trước con trỏ
assert.deepEqual(mentionAt("chào @Tu", 8), { start: 5, query: "Tu" });
assert.deepEqual(mentionAt("@", 1), { start: 0, query: "" });
assert.equal(mentionAt("a@Tu", 4), null);
assert.equal(mentionAt("@Tu an", 6), null);

// Trong chữ che không tạo liên kết
assert.equal(refs("||đáp án #12 của @An|| và #1", ["An"]), "||đáp án #12 của @An|| và [#1](#q-1)");

console.log("check-comment-format: ok");
