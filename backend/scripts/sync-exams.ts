/**
 * Chép đề thi (đề + câu hỏi + ảnh + tệp đính kèm) từ DB/storage này sang DB/storage khác. Không chép giải thích AI, embedding, nhóm câu trùng, người dùng.
 *
 *   npm run sync:exams -- export <thư mục> [--exclude ids.txt]   xuất mọi đề (bỏ các threadId trong ids.txt, mỗi dòng một mã) ra <thư mục>
 *   npm run sync:exams -- import <thư mục> --dry-run             chỉ in sẽ thêm / bỏ qua những đề nào
 *   npm run sync:exams -- import <thư mục>                       nhập thật (đề đã có threadId thì bỏ qua, ảnh đã có thì không ghi đè)
 *
 * Thư mục xuất gồm exams.json và files/<đường dẫn tương đối trong storage>.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/configs/prisma";
import { storageDir } from "../src/configs/env";

type Bundle = { exams: any[] };

// Chặn đường dẫn trong file JSON thoát ra ngoài thư mục gốc
const inside = (root: string, rel: string) => {
  const abs = path.resolve(root, rel);
  if (abs !== root && !abs.startsWith(root + path.sep)) throw new Error(`Đường dẫn không hợp lệ: ${rel}`);
  return abs;
};

async function exportExams(dir: string, excludeFile?: string) {
  const skip = new Set(excludeFile ? (await fs.readFile(excludeFile, "utf8")).split(/\s+/).filter(Boolean) : []);
  const rows = (await prisma.exam.findMany({ include: { questions: { orderBy: { number: "asc" } }, attachments: true }, orderBy: { createdAt: "asc" } })).filter((e) => !skip.has(e.threadId));
  console.log(`Xuất ${rows.length} đề (bỏ qua ${skip.size ? `${skip.size} mã trong file loại trừ` : "không loại trừ"}).`);

  const out = path.resolve(dir);
  let copied = 0;
  const missing: string[] = [];
  for (const e of rows) {
    for (const rel of [...e.questions.map((q) => q.imagePath), ...e.attachments.map((a) => a.filePath)]) {
      const dest = inside(path.join(out, "files"), rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(inside(storageDir, rel), dest).then(() => copied++, () => missing.push(rel));
    }
  }
  // createdById trỏ tới người dùng của máy này nên không mang theo; imageHash (Bytes) đi dạng base64
  const exams = rows.map(({ createdById, questions, ...e }) => ({ ...e, questions: questions.map(({ id, imageHash, ...q }) => ({ ...q, imageHash: imageHash ? Buffer.from(imageHash).toString("base64") : null })) }));
  await fs.writeFile(path.join(out, "exams.json"), JSON.stringify({ exams } satisfies Bundle));
  console.log(`Chép ${copied} tệp vào ${out}${path.sep}files.${missing.length ? ` Thiếu ${missing.length} tệp trong storage (vẫn xuất đề): ${missing.slice(0, 5).join(", ")}${missing.length > 5 ? "..." : ""}` : ""}`);
}

async function importExams(dir: string, dry: boolean) {
  const root = path.resolve(dir);
  const { exams }: Bundle = JSON.parse((await fs.readFile(path.join(root, "exams.json"), "utf8")).replace(/^﻿/, ""));
  const have = new Set((await prisma.exam.findMany({ where: { threadId: { in: exams.map((e) => e.threadId) } }, select: { threadId: true } })).map((e) => e.threadId));
  const todo = exams.filter((e) => !have.has(e.threadId));
  console.log(`Trong gói ${exams.length} đề: thêm ${todo.length}, bỏ qua ${have.size} (đã có).`);
  for (const e of todo) console.log(`  + ${e.threadId}  ${String(e.questions.length).padStart(3)} câu  ${e.title}`);
  if (dry || todo.length === 0) return dry ? console.log("\n--dry-run: chưa ghi gì.") : undefined;

  let done = 0;
  for (const { questions, attachments, ...e } of todo) {
    // Chép tệp trước: nếu DB lỗi thì chỉ còn tệp mồ côi, không có đề thiếu ảnh
    for (const rel of [...questions.map((q: any) => q.imagePath), ...attachments.map((a: any) => a.filePath)]) {
      const dest = inside(storageDir, rel);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.copyFile(inside(path.join(root, "files"), rel), dest, fs.constants.COPYFILE_EXCL).catch((err: NodeJS.ErrnoException) => { if (err.code !== "EEXIST") throw err; });
    }
    await prisma.exam.create({
      data: {
        ...e,
        postedAt: e.postedAt ? new Date(e.postedAt) : null,
        createdAt: new Date(e.createdAt),
        refreshedAt: e.refreshedAt ? new Date(e.refreshedAt) : null,
        questions: { create: questions.map((q: any) => ({ ...q, examId: undefined, imageHash: q.imageHash ? Buffer.from(q.imageHash, "base64") : null })) },
        attachments: { create: attachments.map((a: any) => ({ ...a, id: undefined, examId: undefined, createdAt: new Date(a.createdAt) })) },
      },
    });
    done++;
  }
  console.log(`\nXong: đã thêm ${done} đề.`);
}

async function main() {
  const args = process.argv.slice(2);
  const [mode, dir] = args;
  const ex = args.indexOf("--exclude");
  if ((mode !== "export" && mode !== "import") || !dir) throw new Error("Cú pháp: npm run sync:exams -- export|import <thư mục> [--exclude ids.txt] [--dry-run]");
  if (mode === "export") {
    await fs.mkdir(path.resolve(dir), { recursive: true });
    await exportExams(dir, ex >= 0 ? args[ex + 1] : undefined);
  } else await importExams(dir, args.includes("--dry-run"));
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
