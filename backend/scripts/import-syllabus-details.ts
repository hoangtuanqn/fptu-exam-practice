/**
 * Nhập nội dung Syllabus Details (file JSON của tiện ích FLM, bật tùy chọn "Lấy cả nội dung Syllabus Details") vào bảng subject_chunks
 * và tạo embedding để tìm kiếm theo nghĩa.
 *
 *   npm run import:syllabus-details -- <file.json> --dry-run     chỉ chia đoạn và báo số lượng, không ghi DB, không gọi Gemini
 *   npm run import:syllabus-details -- <file.json>               ghi DB và tạo embedding (cần khoá Gemini trong trang quản trị)
 *   npm run import:syllabus-details -- <file.json> --no-embed    chỉ ghi chữ, chưa tạo embedding
 *   npm run import:syllabus-details -- <file.json> --only=CSI106,PRO192   chỉ các môn này
 *
 * Chạy lại an toàn: đoạn không đổi giữ nguyên vector; bị ngắt giữa chừng thì chạy lại sẽ làm tiếp phần còn thiếu.
 */
import fs from "node:fs";
import { prisma } from "../src/configs/prisma";
import { syllabusKnowledgeService } from "../src/services/syllabus-knowledge.service";
import type { SyllabusSubject } from "../src/utils/syllabus-chunks";

async function main() {
  const args = process.argv.slice(2);
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) throw new Error("Thiếu đường dẫn file JSON.  Ví dụ: npm run import:syllabus-details -- ../flm-syllabus-2026-11-10.json --dry-run");
  const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",").map((c) => c.trim().toUpperCase()).filter(Boolean);
  const data = JSON.parse(fs.readFileSync(file, "utf8").replace(/^\uFEFF/, "")) as { subjects?: SyllabusSubject[] };
  const all = data.subjects ?? [];
  const withDetails = all.filter((s) => s.details && (!only || only.includes(s.code.toUpperCase())));
  console.log(`File: ${file}`);
  console.log(`Môn trong file: ${all.length}, có nội dung đầy đủ${only ? " (đã lọc)" : ""}: ${withDetails.length}`);
  if (withDetails.length === 0) throw new Error("Không có môn nào có trường details. Hãy crawl lại với tùy chọn lấy Syllabus Details.");

  const dryRun = args.includes("--dry-run");
  const embed = !args.includes("--no-embed");
  const t0 = Date.now();
  let lastLog = 0;
  const r = await syllabusKnowledgeService.index(withDetails, {
    embed,
    dryRun,
    onProgress: (done, total) => {
      if (Date.now() - lastLog > 10_000 || done === total) {
        lastLog = Date.now();
        console.log(`  embedding ${done}/${total} đoạn (${Math.round((Date.now() - t0) / 1000)} giây)`);
      }
    },
  });
  console.log(`Đoạn: ${r.chunks} (mới ${r.added}, đổi ${r.changed}, xoá ${r.removed}), tổng ${(r.chars / 1e6).toFixed(1)} triệu ký tự (khoảng ${Math.round(r.chars / 3.2 / 1000)} nghìn token)`);
  if (dryRun) console.log(`--dry-run: chưa ghi gì. Cần tạo embedding cho ${r.pending} đoạn.`);
  else console.log(`Đã tạo embedding: ${r.embedded}. Còn thiếu: ${r.pending}${embed ? "" : " (chạy không --no-embed để tạo)"}.`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
