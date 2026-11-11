/**
 * Gom các câu gần giống nhau giữa các đề của một môn thành nhóm (không gọi AI, không tốn phí).
 * Bước 1 tạo vector cho câu còn thiếu (từ dấu vân tay ảnh đã lưu), bước 2 so từng cặp và ghi lại toàn bộ nhóm của môn trong một giao dịch.
 * Khi ghi thật, lệnh tự tính lại thống kê tần suất của môn ngay sau đó (như npm run stats:refresh), trừ khi có --no-stats.
 *
 *   npm run groups:build -- --subject=PRO192                 tạo vector còn thiếu rồi dựng lại nhóm
 *   npm run groups:build -- --subject=12 --dry-run           không ghi gì, in số nhóm và các cặp sát ngưỡng để chỉnh ngưỡng
 *   npm run groups:build -- --all                            mọi môn
 * Tuỳ chọn: --threshold=0.99  --model=image-fingerprint-v1  --all-chapters (so cả câu khác chương)
 *           --allow-same-exam (cho hai câu cùng đề vào một nhóm)  --batch-size=200
 *           --embed (vẫn tạo vector khi --dry-run)  --no-embed (bỏ bước tạo vector)
 *           --no-stats (không tính lại thống kê)  --half-life=730
 */
import { prisma } from "../src/configs/prisma";
import { STATS_RECENCY_HALF_LIFE_DAYS } from "../src/constants/frequency-stats";
import { FINGERPRINT_MODEL, GROUP_BORDERLINE_MAX_PRINT, groupThresholdFor } from "../src/constants/similarity";
import { subjectRepository, type SubjectRef } from "../src/repositories/subject.repository";
import { providerFor } from "../src/services/embedding";
import type { GroupSummary } from "../src/services/question-group.service";
import { runSimilarityPipeline } from "../src/services/similarity-pipeline.service";
import { assertHalfLife } from "../src/utils/frequency-stats";
import { assertThreshold } from "../src/utils/question-clustering";
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

function printBorderline(r: GroupSummary) {
  if (r.borderline.length === 0) return console.log("  no borderline pairs");
  console.log(`  borderline pairs (|cosine - ${r.threshold.toFixed(4)}| <= margin), closest first:`);
  for (const p of r.borderline.slice(0, GROUP_BORDERLINE_MAX_PRINT)) {
    const side = (q: GroupSummary["borderline"][number]["a"]) => `#${q.questionId} "${q.examTitle}" cau ${q.number}`;
    const mark = p.score >= r.threshold ? "MERGE" : "skip ";
    console.log(`   ${mark} ${p.score.toFixed(4)}  ${side(p.a)}  ~  ${side(p.b)}  [${p.a.chapter ?? "-"}]`);
  }
  if (r.borderline.length > GROUP_BORDERLINE_MAX_PRINT) console.log(`   ... ${r.borderline.length - GROUP_BORDERLINE_MAX_PRINT} more`);
}

async function main() {
  const dryRun = args.has("dry-run");
  const modelName = args.get("model") ?? FINGERPRINT_MODEL;
  const provider = providerFor(modelName);
  const threshold = assertThreshold(args.number("threshold") ?? groupThresholdFor(modelName));
  const halfLifeDays = assertHalfLife(args.number("half-life") ?? STATS_RECENCY_HALF_LIFE_DAYS);
  const embed = args.has("no-embed") ? false : args.has("embed") || !dryRun;
  const stats = !dryRun && !args.has("no-stats");
  console.log(`model=${modelName} threshold=${threshold} dryRun=${dryRun} embed=${embed} stats=${stats}`);

  for (const subject of await subjects()) {
    try {
      const { embed: e, group: r, stats: st } = await runSimilarityPipeline(subject, {
        modelName,
        provider,
        threshold,
        sameChapterOnly: !args.has("all-chapters"),
        allowSameExam: args.has("allow-same-exam"),
        dryRun,
        embed,
        stats,
        batchSize: args.number("batch-size"),
        halfLifeDays,
      });
      if (e) console.log(`[${subject.code}] embedded ${e.embedded}, skipped ${e.skipped} (no fingerprint yet), ${e.batches} batch(es)`);
      const members = r.groups.reduce((s, g) => s + g.length, 0);
      console.log(`[${subject.code}] ${r.questions}/${r.totalQuestions} questions with vectors, ${r.compared} pairs compared, ${r.groups.length} groups (${members} questions)${r.written ? ", written" : ", NOT written (dry run)"}`);
      if (dryRun) printBorderline(r);
      if (st) console.log(`[${subject.code}] stats refreshed: ${st.chapters} chapters, ${st.groups} groups`);
      else if (!dryRun) console.warn(`[${subject.code}] WARNING: group stats are now empty, run npm run stats:refresh -- --subject=${subject.code}`);
    } catch (err) {
      // Một môn lỗi không dừng cả lượt
      console.error(`[${subject.code}] failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exitCode = 1;
    }
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
