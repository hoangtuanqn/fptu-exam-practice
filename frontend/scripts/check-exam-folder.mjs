// Self-check for the admin exam folder validator. Run: node scripts/check-exam-folder.mjs (Node >= 23, strips TS types)
import assert from "node:assert/strict";
import { nameFromFolder, checkFolder, checkResources, findRoot, isQuizFolder, parseAnsJson } from "../src/features/admin/exam-upload/folder.ts";

const img = (path, size = 1000) => ({ path, file: { size, name: path.split("/").pop() } });
const folder = (root, n, extra = []) => [...Array.from({ length: n }, (_, i) => img(`${root}images/Q${i + 1}.webp`)), img(`${root}ans.json`, 10), ...extra];

// Root: the selected folder itself, a parent of it, the shallowest of several
assert.deepEqual(findRoot(["images/Q1.webp", "ans.json"]), { root: "", others: [] });
assert.deepEqual(findRoot(["rendered/images/Q1.webp", "rendered/ans.json"]), { root: "rendered", others: [] });
assert.deepEqual(findRoot(["x/a/b/images/Q1.webp", "x/a/b/ans.json", "x/c/images/Q1.webp", "x/c/ans.json"]), { root: "x/c", others: ["x/a/b"] });
// A folder with ans.json wins over a shallower one without it
assert.equal(findRoot(["images/Q1.webp", "deep/images/Q1.webp", "deep/ans.json"]).root, "deep");
assert.equal(findRoot(["a/Q1.webp"]).root, null);

// ans.json parsing
const p = parseAnsJson('{"Q1.webp":["b"],"Q2.webp":["C","A","A"],"Q3.webp":[],"notes":"x"}');
assert.deepEqual([...p.byNumber], [[1, ["B"]], [2, ["A", "C"]], [3, []]]);
assert.deepEqual(p.unknownKeys, ["notes"]);
assert.equal(p.errors.length, 0);
assert.equal(parseAnsJson('{"Q1.webp":["Z"]}').errors.length, 1);
assert.equal(parseAnsJson('{"Q1.webp":"A"}').errors.length, 1);
assert.equal(parseAnsJson("not json").errors.length, 1);
assert.equal(parseAnsJson("[]").errors.length, 1);

// Create: clean folder, sorted by number not by name
const ans = JSON.stringify({ "Q1.webp": ["B"], "Q2.webp": ["A", "C"], "Q10.webp": ["D"] });
const ok = checkFolder(folder("rendered/", 10), ans);
assert.deepEqual(ok.errors, []);
assert.deepEqual(ok.items.map((i) => i.number), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
assert.deepEqual(ok.items[1].answer, ["A", "C"]);
assert.ok(ok.warnings.some((w) => w.includes("3, 4, 5, 6, 7, 8, 9")));
assert.ok(ok.ansFile);

// Create: missing numbers, bad names, duplicates, too big, too many
const gaps = checkFolder([img("images/Q1.webp"), img("images/Q3.webp"), img("images/q3.WEBP"), img("images/Q4.png"), img("images/Q5.webp", 11 * 1024 * 1024)], null);
assert.ok(gaps.errors.some((e) => e.includes("Thiếu ảnh câu: 2, 4")));
assert.ok(gaps.errors.some((e) => e.includes("Q4.png")));
assert.ok(gaps.errors.some((e) => e.includes("Trùng số câu: 3")));
assert.ok(gaps.errors.some((e) => e.includes("Q5.webp")));
assert.ok(gaps.warnings.some((w) => w.includes("ans.json")));
assert.ok(checkFolder(folder("", 101), "{}").errors.some((e) => e.includes("101")));
// Files in subfolders of images/ are ignored
assert.equal(checkFolder([...folder("", 2), img("images/old/Q9.webp")], "{}").items.length, 2);
// Orphan answer keys are warnings
assert.ok(checkFolder(folder("", 1), '{"Q1.webp":["A"],"Q7.webp":["B"]}').warnings.some((w) => w.includes("7")));
assert.equal(checkFolder([], null).errors.length, 1);

// Update: existing numbers replace, new ones continue from currentMax
const upd = checkFolder([img("images/Q2.webp"), img("images/Q11.webp"), img("images/Q12.webp")], null, 10);
assert.deepEqual(upd.errors, []);
assert.deepEqual(upd.replaced, [2]);
assert.ok(checkFolder([img("images/Q12.webp")], null, 10).errors.some((e) => e.includes("Thiếu ảnh câu: 11")));
assert.deepEqual(checkFolder([img("images/Q3.webp")], null, 10).errors, []);

// Mode: quiz only with images/ and ans.json at the root; anything else is a resource folder
assert.equal(isQuizFolder(["x/images/Q1.webp", "x/ans.json"]), true);
assert.equal(isQuizFolder(["images/Q1.webp"]), false);
assert.equal(isQuizFolder(["a.pdf", "ans.json"]), false);
const res = checkResources([img("d/a.PDF"), img("d/b.zip"), img("d/c.exe"), img("d/.md"), img("d/big.mp4", 11 * 1024 * 1024)]);
assert.deepEqual(res.files.map((f) => f.path), ["d/a.PDF", "d/b.zip", "d/c.exe", "d/.md", "d/big.mp4"]);
assert.ok(res.errors.some((e) => e.includes("big.mp4")));
assert.deepEqual(res.warnings, []);
const noAns = checkResources([img("images/Q1.webp"), img("notes.txt")]);
assert.deepEqual(noAns.errors, []);
assert.ok(noAns.warnings.some((w) => w.includes("ans.json")));
assert.equal(noAns.files.length, 2);
assert.equal(checkResources([img("x.exe")]).errors.length, 0);
assert.equal(checkResources([]).errors.length, 1);
assert.ok(checkResources(Array.from({ length: 101 }, (_, i) => img(`${i}.pdf`))).errors.some((e) => e.includes("101")));

// Tên đề + mã môn lấy từ tên thư mục đã chọn
assert.deepEqual(nameFromFolder(["ENM302 - SU26 - B5 - FE - L/images/Q1.webp"]), { title: "ENM302 - SU26 - B5 - FE - L", subjectCode: "ENM302", kind: "FE" });
assert.equal(nameFromFolder(["PRF192 - FA26 - PE - NO1/a.pdf"])?.kind, "PE");
assert.equal(nameFromFolder(["PRF192 - FA26 - NO1/a.pdf"])?.kind, null);
assert.equal(nameFromFolder(["PRF192 - Practical Exam/a.pdf"])?.kind, "PE");
assert.equal(nameFromFolder(["PRF192_quizzes/a.pdf"])?.kind, "QUIZ");
assert.equal(nameFromFolder(["pro192m_x/a.pdf"])?.subjectCode, "PRO192M");
assert.equal(nameFromFolder(["Đề lẻ/a.pdf"])?.subjectCode, null);
assert.equal(nameFromFolder(["a.pdf"]), null);

console.log("check-exam-folder: ok");
