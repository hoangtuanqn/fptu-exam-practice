// So sánh file JSON xuất từ tiện ích FLM với danh sách mã môn cần có, in ra các môn còn thiếu (mỗi môn một dòng).
//
//   node tools/flm-crawler/check-missing.mjs <file.json> <danh-sách-mã.txt>
//   node tools/flm-crawler/check-missing.mjs flm-syllabus-2026-11-10.json chore/code-courses.txt
//
// Một môn được coi là "có" khi nằm trong file JSON (file chỉ chứa các môn lấy được, status "ok"). Không phân biệt hoa thường.
// Dòng trống trong danh sách mã bị bỏ qua; mã trùng chỉ tính một lần. Danh sách thiếu in ra stdout, phần tóm tắt in ra stderr
// (nên có thể chuyển hướng: ... > thieu.txt).
import fs from "node:fs";

const [jsonPath, listPath] = process.argv.slice(2);
if (!jsonPath || !listPath) {
  console.error("Cách dùng: node tools/flm-crawler/check-missing.mjs <file.json> <danh-sách-mã.txt>");
  process.exit(2);
}

const read = (p) => {
  try {
    return fs.readFileSync(p, "utf8");
  } catch (e) {
    console.error(`Không đọc được ${p}: ${e.message}`);
    process.exit(2);
  }
};

const data = JSON.parse(read(jsonPath).replace(/^﻿/, ""));
const have = new Set((data.subjects ?? []).map((s) => String(s.code).trim().toUpperCase()));

const wanted = [];
const seen = new Set();
for (const raw of read(listPath).split(/\r?\n/)) {
  const code = raw.trim();
  const key = code.toUpperCase();
  if (!code || seen.has(key)) continue;
  seen.add(key);
  wanted.push(code);
}

const missing = wanted.filter((c) => !have.has(c.toUpperCase()));
for (const c of missing) console.log(c);
console.error(`Danh sách ${wanted.length} môn, file JSON có ${have.size} môn, thiếu ${missing.length} môn.`);
const extra = [...have].filter((c) => !seen.has(c));
if (extra.length) console.error(`Có trong JSON nhưng không nằm trong danh sách: ${extra.length} môn (${extra.slice(0, 8).join(", ")}${extra.length > 8 ? ", ..." : ""}).`);
