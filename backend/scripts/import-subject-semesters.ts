/**
 * Gán kỳ học (0-9) cho các môn từ một file JSON hoặc CSV, để Thư viện đề thi xếp môn vào đúng Kỳ.
 *
 *   npm run import:subject-semesters -- <file>              nhập thật
 *   npm run import:subject-semesters -- <file> --dry-run    chỉ kiểm tra và in tóm tắt, không động tới DB
 *
 * Định dạng file:
 *   JSON: { "PRF192": 1, "MAD101": 2, ... }   (mã môn -> kỳ; null hoặc bỏ trống = chưa phân loại)
 *   CSV : mỗi dòng "PRF192,1"
 * Chỉ cập nhật môn đã có trong bảng subjects; môn lạ được liệt kê để bạn xem. Chạy lại nhiều lần an toàn.
 */
import fs from "node:fs";
import path from "node:path";
import { prisma } from "../src/configs/prisma";

function readInput(file: string): Map<string, number | null> {
  const resolved = path.resolve(file.replace(/^"(.*)"$/, "$1"));
  if (!fs.existsSync(resolved)) throw new Error(`Không thấy file: ${resolved}`);
  const text = fs.readFileSync(resolved, "utf8").replace(/^﻿/, "");
  const pairs: [string, unknown][] = resolved.toLowerCase().endsWith(".csv")
    ? text.split(/\r?\n/).filter((l) => l.trim()).map((l) => l.split(",").map((x) => x.trim()) as [string, string])
    : Object.entries(JSON.parse(text) as Record<string, unknown>);
  const out = new Map<string, number | null>();
  for (const [code, raw] of pairs) {
    if (!/^[A-Za-z]{2,4}\d{3}[A-Za-z]?$/.test(code)) continue; // bỏ dòng tiêu đề / mã sai
    const n = raw === null || raw === "" || raw === undefined ? null : Number(raw);
    if (n !== null && !(Number.isInteger(n) && n >= 0 && n <= 9)) throw new Error(`Kỳ không hợp lệ cho ${code}: ${String(raw)} (phải từ 0 đến 9)`);
    out.set(code.toUpperCase(), n);
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) throw new Error("Thiếu đường dẫn file. Ví dụ: npm run import:subject-semesters -- semesters.json --dry-run");

  const wanted = readInput(file);
  const existing = await prisma.subject.findMany({ where: { code: { in: [...wanted.keys()] } }, select: { code: true, semester: true } });
  const have = new Map(existing.map((s) => [s.code, s.semester]));
  const missing = [...wanted.keys()].filter((c) => !have.has(c));
  const changes = [...wanted].filter(([code, sem]) => have.has(code) && have.get(code) !== sem);

  console.log(`Trong file: ${wanted.size} môn. Có trong DB: ${have.size}. Cần đổi: ${changes.length}. Không thấy trong DB: ${missing.length}.`);
  if (missing.length) console.log(`Môn không thấy trong DB (bỏ qua): ${missing.slice(0, 30).join(", ")}${missing.length > 30 ? " ..." : ""}`);
  if (dry) return console.log("[dry-run] Không ghi gì vào DB.");

  for (const [code, semester] of changes) await prisma.subject.update({ where: { code }, data: { semester } });
  console.log(`Đã cập nhật ${changes.length} môn.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
