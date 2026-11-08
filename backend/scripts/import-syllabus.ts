/**
 * Nhập dữ liệu môn học (chương và chủ đề) từ file JSON do tiện ích tools/flm-crawler xuất ra vào MySQL.
 *
 *   npm run import:syllabus -- <đường dẫn file.json>              nhập thật
 *   npm run import:syllabus -- <đường dẫn file.json> --dry-run    chỉ kiểm tra và in tóm tắt, không động tới DB
 *
 * Chạy lại nhiều lần an toàn: môn đã có (theo mã) được cập nhật, các chương được đồng bộ đúng theo file
 * (chương không còn trong file bị xoá). Môn nào trong file bị lỗi định dạng thì bỏ qua và báo, không ảnh hưởng môn khác.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const chapterSchema = z.object({
  number: z.number().int().min(0).max(999).nullable(), // null = nhóm "Khác" (dòng đứng trước chương đầu tiên)
  title: z.string().transform((t) => t.slice(0, 255)), // cột title dài 255 ký tự: cắt bớt thay vì bỏ cả môn
  topics: z.array(z.string().min(1).max(2000)).max(1000), // JSON nên không cần chặt; chỉ chặn dữ liệu bất thường
});
const subjectSchema = z.object({
  code: z.string().regex(/^[A-Za-z0-9_.-]{3,20}$/, "mã môn không hợp lệ"),
  subjectName: z.string().min(1).max(200),
  syllabusId: z.string().max(20).optional(),
  chapters: z.array(chapterSchema).max(100),
});
const fileSchema = z.object({ subjects: z.array(z.unknown()) });

type SubjectInput = z.infer<typeof subjectSchema>;

function readInput(file: string) {
  const resolved = path.resolve(file.replace(/^"(.*)"$/, "$1")); // chấp nhận đường dẫn dán kèm dấu ngoặc kép
  if (!fs.existsSync(resolved)) throw new Error(`Không thấy file: ${resolved}`);
  const raw = JSON.parse(fs.readFileSync(resolved, "utf8").replace(/^\uFEFF/, ""));
  const { subjects } = fileSchema.parse(raw);
  const valid: SubjectInput[] = [];
  const skipped: string[] = [];
  const seen = new Set<string>();
  for (const [i, s] of subjects.entries()) {
    const parsed = subjectSchema.safeParse(s);
    if (!parsed.success) {
      skipped.push(`#${i + 1} ${(s as { code?: string })?.code ?? "?"}: ${parsed.error.issues[0]?.message ?? "sai định dạng"}`);
      continue;
    }
    const code = parsed.data.code.toUpperCase();
    if (seen.has(code)) {
      skipped.push(`#${i + 1} ${code}: trùng mã trong file, giữ bản đầu`);
      continue;
    }
    seen.add(code);
    // Gộp các chương trùng số (chỉ xảy ra khi file bị sửa tay); chương không số xếp vào số 0
    const chapters = new Map<number, { title: string; topics: string[] }>();
    for (const c of parsed.data.chapters) {
      const n = c.number ?? 0;
      const cur = chapters.get(n) ?? { title: c.title, topics: [] };
      cur.topics.push(...c.topics.filter((t) => !cur.topics.includes(t)));
      chapters.set(n, cur);
    }
    valid.push({ ...parsed.data, code, chapters: [...chapters.entries()].sort((a, b) => a[0] - b[0]).map(([number, c]) => ({ number, ...c })) });
  }
  return { resolved, valid, skipped };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const file = args.find((a) => !a.startsWith("--"));
  if (!file) throw new Error("Thiếu đường dẫn file JSON.  Ví dụ: npm run import:syllabus -- C:/Users/ad/Downloads/flm-syllabus.json --dry-run");

  const { resolved, valid, skipped } = readInput(file);
  console.log(`File: ${resolved}`);
  console.log(`Hợp lệ ${valid.length} môn${skipped.length ? `, bỏ qua ${skipped.length}` : ""}`);
  for (const s of skipped) console.log(`  bỏ qua  ${s}`);
  for (const s of valid) {
    const topics = s.chapters.reduce((n, c) => n + c.topics.length, 0);
    console.log(`  ${s.code.padEnd(8)} ${s.chapters.length} chương, ${String(topics).padStart(3)} chủ đề  ${s.subjectName}`);
  }
  if (valid.length === 0) return;
  if (dryRun) return console.log("\n--dry-run: chưa ghi gì vào DB.");

  // Chỉ nạp Prisma khi ghi thật (dry-run không cần DB hay file .env)
  const { prisma } = await import("../src/configs/prisma");
  try {
    let created = 0;
    let updated = 0;
    for (const s of valid) {
      await prisma.$transaction(async (tx) => {
        const existing = await tx.subject.findUnique({ where: { code: s.code }, select: { id: true } });
        const subject = await tx.subject.upsert({
          where: { code: s.code },
          create: { code: s.code, name: s.subjectName, syllabusId: s.syllabusId ?? null },
          update: { name: s.subjectName, syllabusId: s.syllabusId ?? null },
        });
        existing ? updated++ : created++;
        const numbers = s.chapters.map((c) => c.number as number);
        await tx.subjectChapter.deleteMany({ where: { subjectId: subject.id, number: { notIn: numbers } } });
        for (const c of s.chapters) {
          await tx.subjectChapter.upsert({
            where: { subjectId_number: { subjectId: subject.id, number: c.number as number } },
            create: { subjectId: subject.id, number: c.number as number, title: c.title, topics: c.topics },
            update: { title: c.title, topics: c.topics },
          });
        }
      });
    }
    console.log(`\nXong: thêm mới ${created} môn, cập nhật ${updated} môn.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
