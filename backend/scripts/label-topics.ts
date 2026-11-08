/**
 * Gắn chủ đề (theo syllabus môn học) cho câu hỏi trong kho đề, bằng AI.
 *
 *   npm run label:topics -- --sample 20      chạy thử 20 câu, IN KẾT QUẢ ĐỂ XEM, không ghi DB
 *   npm run label:topics -- --exam 12        gắn cho đề có id 12 (ghi DB)
 *   npm run label:topics -- --all            gắn cho mọi đề (chỉ câu chưa có nhãn, ghi DB)
 *   thêm --force để gắn lại cả câu đã có nhãn
 *
 * Đề mới lấy về được gắn tự động sau khi AI giải xong đáp án; script này dùng cho đề có sẵn và để chạy thử.
 */
import { prisma } from "../src/configs/prisma";
import { topicLabelerService } from "../src/services/ai/topic-labeler.service";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

async function main() {
  const force = flag("force");
  const sample = Number(value("sample")) || 0;
  const examId = Number(value("exam")) || 0;
  if (!sample && !examId && !flag("all")) throw new Error("Chọn một chế độ: --sample N, --exam ID hoặc --all");

  const exams = await prisma.exam.findMany({ where: examId ? { id: examId } : {}, orderBy: { id: "asc" }, select: { id: true } });
  let left = sample || Infinity;
  let total = 0;
  let labeled = 0;
  for (const { id } of exams) {
    if (left <= 0) break;
    const r = await topicLabelerService.labelExam(id, { save: !sample, force, max: Number.isFinite(left) ? Math.ceil(left / Math.max(1, Math.min(exams.length, 3))) : undefined });
    if (r.skipped) {
      console.log(`- ${r.title || `đề ${id}`}: bỏ qua (${r.skipped})`);
      continue;
    }
    console.log(`\n${r.title}  [${r.subject}]`);
    for (const l of r.labels) console.log(`  câu ${String(l.number).padStart(2)}  →  ${l.topic ?? "(không gắn được)"}`);
    total += r.labels.length;
    labeled += r.labels.filter((l) => l.topic).length;
    left -= r.labels.length;
  }
  console.log(`\nTổng ${total} câu, gắn được ${labeled}.${sample ? " (chạy thử: chưa ghi DB)" : ""}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
