/**
 * Ghi huy hiệu cho mọi tài khoản đang hoạt động theo dữ liệu đã có (chạy một lần sau khi deploy migration 0092).
 * Không gửi thông báo. Chạy lại bao nhiêu lần cũng được: chỉ ghi khi cấp tính ra cao hơn cấp đã lưu.
 *
 *   npm run backfill:badges -- --dry-run     (chỉ đếm, không ghi)
 *   npm run backfill:badges
 */
import { prisma } from "../src/configs/prisma";
import { BADGE_BACKFILL_BATCH } from "../src/constants/badges";
import { userNoticeRepository } from "../src/repositories/user-notice.repository";
import { badgeService } from "../src/services/badge.service";
import { parseArgs } from "./lib/cli-args";

const args = parseArgs();

async function main() {
  const dryRun = args.has("dry-run");
  let users = 0;
  let raised = 0;
  let failed = 0;
  let after: string | null = null;
  for (;;) {
    const ids = await userNoticeRepository.activeUserIds(after, BADGE_BACKFILL_BATCH); // id tăng dần, không OFFSET
    for (const id of ids) {
      try {
        raised += await badgeService.backfill(id, dryRun);
      } catch (err) {
        failed++; // một người lỗi không dừng cả lô; không in dữ liệu người dùng
        console.error("[backfill-badges] failed:", (err as Error).message);
      }
    }
    users += ids.length;
    console.log(`[backfill-badges] ${users} users scanned, ${raised} badges ${dryRun ? "would be written" : "written"}, ${failed} failed`);
    if (ids.length < BADGE_BACKFILL_BATCH) break;
    after = ids[ids.length - 1]!;
  }
  if (failed) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
