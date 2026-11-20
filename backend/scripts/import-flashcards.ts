/**
 * Nhập flashcard của một môn từ một thư mục làm sẵn (ảnh câu hỏi + đáp án). Flashcard là bộ ảnh riêng, không lấy từ đề thi.
 *
 *   npm run import:flashcards -- <thư mục> --subject PRO192 --dry-run   chỉ kiểm tra và in tóm tắt, không ghi gì
 *   npm run import:flashcards -- <thư mục> --subject PRO192             nhập thật
 *
 * Thư mục gồm:
 *   images/Q1.webp, Q2.webp, ...   ảnh câu hỏi, đánh số liền nhau từ Q1
 *   answers.json                   mảng đáp án, phần tử thứ i là đáp án của câu i+1: [["A","B","D"],["A"],["C"], ...]
 * Môn phải có sẵn trong bảng subjects. Ảnh được chép vào storage/flashcards/<MÃ MÔN>/ (không công khai, chỉ phát qua link ký).
 * Chạy lại an toàn: thay toàn bộ thẻ của môn đó bằng bộ mới (không đụng môn khác).
 */
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/configs/prisma";
import { storageDir } from "../src/configs/env";
import { FLASHCARD_STORAGE_DIR } from "../src/constants/flashcard";
import { checkFlashcardSet } from "../src/utils/flashcard";
import { subjectCodeSchema } from "../src/rules/requests/subject.request";

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes("--dry-run");
  const flag = args.indexOf("--subject");
  const rawCode = flag >= 0 ? args[flag + 1] : undefined;
  const dirArg = args.find((a, i) => !a.startsWith("--") && i !== flag + 1);
  if (!dirArg || !rawCode) throw new Error("Cú pháp: npm run import:flashcards -- <thư mục> --subject PRO192 [--dry-run]");
  const code = subjectCodeSchema.parse(rawCode).toUpperCase();

  const dir = path.resolve(dirArg.replace(/^"(.*)"$/, "$1"));
  const imagesDir = path.join(dir, "images");
  const names = await fs.readdir(imagesDir).catch(() => {
    throw new Error(`Không thấy thư mục ảnh: ${imagesDir}`);
  });
  const answers: unknown = JSON.parse((await fs.readFile(path.join(dir, "answers.json"), "utf8").catch(() => { throw new Error(`Không thấy ${path.join(dir, "answers.json")}`); })).replace(/^﻿/, ""));

  const checked = checkFlashcardSet(names, answers);
  if (!checked.ok) {
    console.error(`Bộ thẻ chưa hợp lệ (${checked.errors.length} lỗi), chưa nhập gì:`);
    for (const e of checked.errors) console.error(`  - ${e}`);
    process.exitCode = 1;
    return;
  }
  const { cards } = checked.set;
  const multi = cards.filter((c) => c.answer.includes(" ")).length;
  console.log(`Môn ${code}: ${cards.length} thẻ (${multi} câu nhiều đáp án), ảnh Q1..Q${cards.length} đủ.`);
  console.log(`Ví dụ: câu 1 = ${cards[0]!.answer}, câu ${Math.min(10, cards.length)} = ${cards[Math.min(10, cards.length) - 1]!.answer}`);
  if (dry) return console.log("[dry-run] Không ghi gì vào DB hay storage.");

  const subject = await prisma.subject.findUnique({ where: { code }, select: { id: true } });
  if (!subject) throw new Error(`Môn ${code} chưa có trong bảng subjects (chạy import:syllabus trước).`);

  const out = path.join(storageDir, FLASHCARD_STORAGE_DIR, code);
  await fs.mkdir(out, { recursive: true });
  for (const c of cards) await fs.copyFile(path.join(imagesDir, `Q${c.number}.webp`), path.join(out, `Q${c.number}.webp`));
  await prisma.$transaction([prisma.flashcard.deleteMany({ where: { subjectId: subject.id } }), prisma.flashcard.createMany({ data: cards.map((c) => ({ subjectId: subject.id, number: c.number, answer: c.answer })) })]);
  console.log(`Đã nhập ${cards.length} thẻ, ảnh ở ${out}.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
