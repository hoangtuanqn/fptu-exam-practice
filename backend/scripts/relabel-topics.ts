/**
 * Đổi tên chương đã gắn trên các câu hỏi cũ sang cách đặt tên mới (đúng chữ trong syllabus, không trùng tên).
 * Không gọi AI: nhãn cũ dạng "Phần N: ..." được đổi theo số chương N; nhãn khác chỉ đổi khi trùng tên mới sau khi bỏ hoa thường và dấu câu.
 *
 *   npm run relabel:topics              chỉ in những gì sẽ đổi, không ghi DB
 *   npm run relabel:topics -- --apply   ghi thật (nhớ sao lưu DB trước)
 */
import { prisma } from "../src/configs/prisma";
import { subjectCodeFromTitle } from "../src/utils/subject-code";
import { buildTopicItems } from "../src/utils/topic-items";

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

async function findSubject(title: string) {
  const code = subjectCodeFromTitle(title);
  if (!code) return null;
  const include = { chapters: { orderBy: { number: "asc" as const } } };
  return (await prisma.subject.findUnique({ where: { code }, include })) ?? (await prisma.subject.findFirst({ where: { code: { startsWith: code.replace(/[A-Z]$/, "") } }, include }));
}

async function main() {
  const apply = process.argv.includes("--apply");
  const exams = await prisma.exam.findMany({ where: { questions: { some: { topic: { not: null } } } }, select: { id: true, title: true } });
  let changedExams = 0;
  let changedQuestions = 0;
  let unmatched = 0;
  const examples: string[] = [];

  for (const exam of exams) {
    const subject = await findSubject(exam.title);
    if (!subject) continue;
    const items = buildTopicItems(subject.chapters.map((c) => ({ number: c.number, title: c.title, topics: (c.topics as string[]) ?? [] })));
    const labels = new Set(items.map((i) => i.label));
    const byChapter = new Map(items.filter((i) => i.chapter !== undefined).map((i) => [i.chapter!, i.label]));
    const byNorm = new Map(items.map((i) => [norm(i.label), i.label]));

    const questions = await prisma.examQuestion.findMany({ where: { examId: exam.id, topic: { not: null } }, select: { number: true, topic: true } });
    const moves = new Map<string, number[]>(); // nhãn mới -> số câu
    for (const q of questions) {
      const old = q.topic!;
      if (labels.has(old)) continue; // đã đúng nhãn mới
      const part = old.match(/^(?:Phần|Chương) (\d+):/);
      // Nhãn cũ kiểu "4. Social Comparison (cont)": bỏ số đầu và "(cont)" rồi so theo tên chương mới
      const bare = old.replace(/^\d+\.\s*/, "").replace(/\s*\(cont\.?\)\s*$/i, "");
      const next = (part && byChapter.get(Number(part[1]))) || byNorm.get(norm(old)) || byNorm.get(norm(bare));
      if (!next) {
        unmatched++;
        continue;
      }
      moves.set(next, [...(moves.get(next) ?? []), q.number]);
      if (examples.length < 8) examples.push(`${subject.code}: "${old}" -> "${next}"`);
    }
    if (moves.size === 0) continue;
    changedExams++;
    for (const [label, numbers] of moves) {
      changedQuestions += numbers.length;
      if (apply) await prisma.examQuestion.updateMany({ where: { examId: exam.id, number: { in: numbers } }, data: { topic: label } });
    }
  }

  console.log(examples.join("\n"));
  console.log(`${apply ? "Đã đổi" : "Sẽ đổi"}: ${changedQuestions} câu ở ${changedExams} đề. Không khớp nhãn mới (giữ nguyên): ${unmatched} câu.`);
  if (!apply) console.log("Đây chỉ là chạy thử. Thêm --apply để ghi thật.");
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
