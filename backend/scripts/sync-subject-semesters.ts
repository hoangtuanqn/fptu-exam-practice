/**
 * Lấy kỳ học (0-9) của từng môn từ mục "TÀI LIỆU CÁC MÔN HỌC" của FuOverflow rồi ghi vào subjects.semester.
 * Máy chủ cũng tự chạy việc này mỗi đêm; script này để chạy tay lần đầu hoặc kiểm tra.
 *
 *   npm run sync:subject-semesters -- --dry-run     chỉ in kết quả, không ghi DB
 *   npm run sync:subject-semesters                  ghi kỳ cho môn chưa có kỳ
 *   npm run sync:subject-semesters -- --overwrite   ghi đè cả kỳ đã có (kể cả do admin đặt)
 */
import { prisma } from "../src/configs/prisma";
import { fetchSubjectSemesters, syncSubjectSemesters } from "../src/services/crawler/fuo-subjects.service";

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const overwrite = process.argv.includes("--overwrite");
  const data = await fetchSubjectSemesters();
  const per = new Map<number, number>();
  for (const s of data.semesters.values()) per.set(s, (per.get(s) ?? 0) + 1);
  const counts = [...per].sort((a, b) => a[0] - b[0]).map(([k, n]) => `Kỳ ${k}=${n}`).join(", ");
  console.log(`Đọc được ${data.semesters.size} môn có kỳ: ${counts}; chưa rõ kỳ: ${data.unknown.length}; nằm ở nhiều kỳ: ${data.multi.length}${data.multi.length ? ` (${data.multi.slice(0, 10).join(", ")})` : ""}`);
  const r = await syncSubjectSemesters({ dryRun, overwrite });
  console.log(`${dryRun ? "[dry-run] " : ""}Cập nhật ${r.updated}, giữ nguyên ${r.unchanged}, chưa có trong hệ thống ${r.notInSystem}, bỏ qua do đã có kỳ khác ${r.conflicts}`);
  if (r.sample.length) console.log(`Ví dụ: ${r.sample.join("; ")}`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
