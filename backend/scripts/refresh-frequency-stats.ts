/**
 * Tính lại thống kê tần suất ra đề (theo chương và theo nhóm câu) của một môn hoặc mọi môn. Mỗi môn một giao dịch, chạy lại bao nhiêu lần cũng được.
 * Thống kê nhóm đọc từ nhóm do npm run groups:build tạo, nên chạy lệnh đó trước.
 *
 *   npm run stats:refresh -- --subject=PRO192      (hoặc --subject=<id>)
 *   npm run stats:refresh -- --all
 * Tuỳ chọn: --half-life=730 (số ngày để trọng số của một đề còn một nửa, mặc định trong constants/frequency-stats)
 */
import { prisma } from "../src/configs/prisma";
import { STATS_RECENCY_HALF_LIFE_DAYS } from "../src/constants/frequency-stats";
import { subjectRepository, type SubjectRef } from "../src/repositories/subject.repository";
import { frequencyStatsService } from "../src/services/frequency-stats.service";
import { assertHalfLife } from "../src/utils/frequency-stats";
import { parseArgs } from "./lib/cli-args";

const args = parseArgs();

async function subjects(): Promise<SubjectRef[]> {
  if (args.has("all")) return subjectRepository.listAll();
  const ref = args.get("subject");
  if (!ref) throw new Error("Missing --subject=<id or code> (or --all)");
  const s = await subjectRepository.findByIdOrCode(ref);
  if (!s) throw new Error(`Subject not found: ${ref}`);
  return [s];
}

async function main() {
  const halfLifeDays = assertHalfLife(args.number("half-life") ?? STATS_RECENCY_HALF_LIFE_DAYS);
  let failed = 0;
  for (const subject of await subjects()) {
    try {
      const r = await frequencyStatsService.refresh(subject, { halfLifeDays });
      if (r.chapters || r.groups) console.log(`[${subject.code}] ${r.chapters} chapters, ${r.groups} groups`);
    } catch (err) {
      failed++; // một môn lỗi không dừng cả lượt
      console.error(`[${subject.code}] failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  if (failed) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
