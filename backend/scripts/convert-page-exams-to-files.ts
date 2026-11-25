/**
 * Đề crawl về mà "câu hỏi" thực chất là các trang ảnh của một đề thực hành / tự luận (không có đáp án A-H để chấm) được quy về
 * giống đề admin tải thư mục tài liệu lên: 0 câu hỏi, mọi trang ảnh là tệp đính kèm (exams/<threadId>/files/<hex>-Q<n>.webp).
 *
 * Chọn đề: (1) loại PE có dòng câu hỏi, hoặc (2) loại khác nhưng mọi câu đều chưa có đáp án và nguồn đáp án là FAILED
 * (AI không giải được). Đề nguồn MANUAL (admin đã sửa tay) và đề có bài làm đã nộp thì bỏ qua.
 *
 *   npm run convert:page-exams                 chỉ liệt kê đề sẽ chuyển (không ghi gì)
 *   npm run convert:page-exams -- --apply      chuyển thật
 *   npm run convert:page-exams -- --only=7685,7675   chỉ các threadId này
 *
 * Mỗi đề: chuyển ảnh sang thư mục files, thêm dòng tệp đính kèm, xoá các dòng câu hỏi, totalQuestions = 0, nguồn đáp án DEFAULT.
 * Chạy lại an toàn (đề đã chuyển không còn dòng câu hỏi nên không được chọn nữa). Backup DB trước khi chạy thật.
 */
import { randomBytes } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/configs/prisma";
import { storageDir } from "../src/configs/env";
import { EXAM_FILES_DIR, EXAM_STORAGE_DIR } from "../src/constants/crawler";
import { attachmentType } from "../src/utils/attachment";
import { resolveInside } from "../src/utils/exam-zip";

async function candidates(only: string[] | null) {
  const exams = await prisma.exam.findMany({
    where: { questions: { some: {} }, ...(only && { threadId: { in: only } }) },
    select: {
      id: true,
      threadId: true,
      title: true,
      kind: true,
      answerSource: true,
      _count: { select: { attempts: true } },
      questions: { orderBy: { number: "asc" }, select: { id: true, number: true, name: true, imagePath: true, answer: true } },
    },
  });
  const skipped: string[] = [];
  const picked = exams.filter((e) => {
    const noAnswers = e.questions.every((q) => q.answer === "");
    const pages = e.kind === "PE" || (noAnswers && e.answerSource === "FAILED");
    if (!pages) return false;
    if (e.answerSource === "MANUAL") return void skipped.push(`${e.threadId} (MANUAL) ${e.title}`);
    if (e._count.attempts > 0) return void skipped.push(`${e.threadId} (có bài làm đã nộp) ${e.title}`);
    return true;
  });
  return { picked, skipped };
}

async function convert(e: Awaited<ReturnType<typeof candidates>>["picked"][number]) {
  const moved: { from: string; to: string }[] = [];
  const rows: { name: string; filePath: string; mime: string; sizeBytes: number; sourceUrl: string }[] = [];
  try {
    for (const q of e.questions) {
      const from = resolveInside(storageDir, q.imagePath);
      if (!from) throw new Error(`đường dẫn ảnh không hợp lệ: ${q.imagePath}`);
      const name = `${q.name || `Q${q.number}`}${path.extname(q.imagePath) || ".webp"}`;
      const file = `${randomBytes(4).toString("hex")}-${name}`;
      const rel = `${EXAM_STORAGE_DIR}/${e.threadId}/${EXAM_FILES_DIR}/${file}`;
      const to = resolveInside(storageDir, rel)!;
      await fs.mkdir(path.dirname(to), { recursive: true });
      const size = (await fs.stat(from)).size; // ảnh thiếu thì ném lỗi: không chuyển nửa chừng
      await fs.rename(from, to);
      moved.push({ from, to });
      rows.push({ name, filePath: rel, mime: attachmentType(name)?.mime ?? "application/octet-stream", sizeBytes: size, sourceUrl: "" });
    }
    await prisma.$transaction(async (tx) => {
      await tx.examAttachment.createMany({ data: rows.map((r) => ({ ...r, examId: e.id })) });
      await tx.examQuestion.deleteMany({ where: { examId: e.id } });
      await tx.exam.update({ where: { id: e.id }, data: { totalQuestions: 0, answerSource: "DEFAULT", aiReport: null } });
    });
  } catch (err) {
    for (const m of moved.reverse()) await fs.rename(m.to, m.from).catch(() => undefined); // trả ảnh về chỗ cũ
    throw err;
  }
  await fs.rmdir(path.join(storageDir, EXAM_STORAGE_DIR, e.threadId, "images")).catch(() => undefined); // chỉ xoá khi đã rỗng
  return rows.length;
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const only = args.find((a) => a.startsWith("--only="))?.slice(7).split(",").map((s) => s.trim()).filter(Boolean) ?? null;
  const { picked, skipped } = await candidates(only);
  console.log(`Chọn ${picked.length} đề${skipped.length ? `, bỏ qua ${skipped.length}` : ""}.`);
  for (const e of picked) console.log(`  ${e.threadId.padEnd(8)} ${e.kind ?? "-"} ${String(e.questions.length).padStart(3)} trang  ${e.title}`);
  for (const s of skipped) console.log(`  bỏ qua: ${s}`);
  if (!apply) return console.log("\nChưa ghi gì. Thêm --apply để chuyển thật.");

  let done = 0;
  for (const e of picked) {
    try {
      const n = await convert(e);
      done++;
      console.log(`  đã chuyển ${e.threadId}: ${n} trang -> tệp đính kèm`);
    } catch (err) {
      console.error(`  LỖI ${e.threadId}: ${(err as Error).message} (đề này giữ nguyên)`);
    }
  }
  console.log(`\nXong: ${done}/${picked.length} đề.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
