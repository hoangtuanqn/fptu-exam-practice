/**
 * Chạy ngay một lượt của việc ban đêm (jobs/similarity.cron.ts): môn có đề đổi hoặc còn ảnh chưa tính thì tính dấu vân tay
 * (có trần mỗi lượt), tạo vector, dựng lại nhóm và tính lại thống kê. Chạy lại khi không có gì đổi thì không làm gì.
 *
 *   npm run job:similarity
 *   npm run job:similarity -- --force        làm lại mọi môn có đề (vd sau khi gắn lại chương), thử lại cả ảnh từng không đọc được
 * Tuỳ chọn: --max-hashes=2000 (trần số ảnh mới của lượt này, mặc định trong constants/similarity)
 */
import { prisma } from "../src/configs/prisma";
import { formatSimilaritySummary, similarityJobService } from "../src/services/similarity-job.service";
import { parseArgs } from "./lib/cli-args";

const args = parseArgs();

async function main() {
  const maxHashes = args.number("max-hashes");
  if (maxHashes !== undefined && (!Number.isInteger(maxHashes) || maxHashes < 0)) throw new Error("--max-hashes must be a non-negative integer");
  const r = await similarityJobService.run({ force: args.has("force"), maxHashes });
  if (!r) throw new Error("Another run is in progress");
  console.log(formatSimilaritySummary(r));
  if (r.failed) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
