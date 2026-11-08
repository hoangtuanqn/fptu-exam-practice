/**
 * Nhập danh sách đề FuOverflow (chỉ nhãn "Đề Thi FE") từ file JSON do tiện ích tools/fuo-crawler xuất ra vào bảng fuo_threads.
 * Đây chỉ là danh mục (tên đề, ngày đăng...) để Kho đề hiện đủ đề; ảnh đề chỉ được lấy khi người dùng bấm lấy và đồng ý trừ phí.
 *
 *   npm run import:fuo-catalog -- <đường dẫn file.json>              nhập thật
 *   npm run import:fuo-catalog -- <đường dẫn file.json> --dry-run    chỉ kiểm tra và in tóm tắt, không động tới DB
 *
 * Chạy lại nhiều lần an toàn: bài đã có (theo thread ID) được cập nhật, bài mới được thêm. Không xoá bài nào khỏi DB.
 * Bài không có nhãn "Đề Thi FE" hoặc sai định dạng thì bỏ qua và báo.
 */
import fs from "node:fs";
import path from "node:path";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../src/configs/prisma";
import { REQUIRED_LABEL } from "../src/services/crawler/thread-scraper.service";

const BATCH = 500;

const threadSchema = z.object({
  threadId: z.string().regex(/^\d{1,18}$/, "threadId không hợp lệ"),
  title: z.string().trim().min(1).transform((t) => t.slice(0, 255)),
  prefix: z.string().optional(),
  postedAt: z.string().nullable().optional(),
  replies: z.number().int().min(0).optional(),
});
const subjectSchema = z.object({ code: z.string().regex(/^[A-Za-z0-9]{2,12}$/, "mã môn không hợp lệ"), threads: z.array(z.unknown()) });
const fileSchema = z.object({ subjects: z.array(z.unknown()) });

interface Row {
  threadId: string;
  subjectCode: string;
  title: string;
  postedAt: Date | null;
  replies: number;
}

function readInput(file: string) {
  const resolved = path.resolve(file.replace(/^"(.*)"$/, "$1")); // chấp nhận đường dẫn dán kèm dấu ngoặc kép
  if (!fs.existsSync(resolved)) throw new Error(`Không thấy file: ${resolved}`);
  const { subjects } = fileSchema.parse(JSON.parse(fs.readFileSync(resolved, "utf8").replace(/^﻿/, "")));

  const rows = new Map<string, Row>(); // khử trùng theo threadId (một bài chỉ thuộc một môn)
  const skipped: string[] = [];
  let notFe = 0;
  for (const [i, s] of subjects.entries()) {
    const sub = subjectSchema.safeParse(s);
    if (!sub.success) {
      skipped.push(`môn #${i + 1}: ${sub.error.issues[0]?.message ?? "sai định dạng"}`);
      continue;
    }
    const code = sub.data.code.toUpperCase();
    for (const t of sub.data.threads) {
      const parsed = threadSchema.safeParse(t);
      if (!parsed.success) {
        skipped.push(`${code}: ${parsed.error.issues[0]?.message ?? "bài sai định dạng"}`);
        continue;
      }
      if ((parsed.data.prefix ?? "").trim() !== REQUIRED_LABEL) {
        notFe++;
        continue;
      }
      const date = parsed.data.postedAt ? new Date(parsed.data.postedAt) : null;
      rows.set(parsed.data.threadId, {
        threadId: parsed.data.threadId,
        subjectCode: code,
        title: parsed.data.title,
        postedAt: date && !Number.isNaN(date.getTime()) ? date : null,
        replies: parsed.data.replies ?? 0,
      });
    }
  }
  return { resolved, rows: [...rows.values()], skipped, notFe, subjects: subjects.length };
}

async function upsertBatch(batch: Row[]) {
  const values = batch.map((r) => Prisma.sql`(${r.threadId}, ${r.subjectCode}, ${r.title}, ${r.postedAt}, ${r.replies}, NOW(3))`);
  await prisma.$executeRaw`
    INSERT INTO fuo_threads (thread_id, subject_code, title, posted_at, replies, synced_at)
    VALUES ${Prisma.join(values)}
    ON DUPLICATE KEY UPDATE subject_code = VALUES(subject_code), title = VALUES(title), posted_at = VALUES(posted_at), replies = VALUES(replies), synced_at = VALUES(synced_at)`;
}

(async () => {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) throw new Error("Cách dùng: npm run import:fuo-catalog -- <đường dẫn file.json> [--dry-run]");

  const { resolved, rows, skipped, notFe, subjects } = readInput(file);
  const bySubject = new Map<string, number>();
  for (const r of rows) bySubject.set(r.subjectCode, (bySubject.get(r.subjectCode) ?? 0) + 1);
  console.log(`File: ${resolved}`);
  console.log(`${subjects} môn trong file, ${rows.length} đề FE hợp lệ thuộc ${bySubject.size} môn; bỏ ${notFe} bài khác nhãn, ${skipped.length} bài/môn sai định dạng.`);
  for (const s of skipped.slice(0, 15)) console.log("  bỏ qua:", s);
  const top = [...bySubject.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  console.log("Nhiều đề nhất:", top.map(([c, n]) => `${c}=${n}`).join(", "));
  if (dry) return void console.log("(--dry-run) chưa ghi gì vào DB.");

  const before = await prisma.fuoThread.count();
  for (let i = 0; i < rows.length; i += BATCH) await upsertBatch(rows.slice(i, i + BATCH));
  const after = await prisma.fuoThread.count();
  console.log(`Xong. Đã thêm ${after - before} đề mới, cập nhật ${rows.length - (after - before)} đề đã có. Tổng trong DB: ${after}.`);
})()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
