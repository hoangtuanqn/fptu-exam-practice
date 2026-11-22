/**
 * Cộng credit cho mọi thành viên đang hoạt động (vd đền bù bảo trì). Mỗi người nhận một dòng sổ cái loại "chỉnh tay"
 * kèm thông báo trên chuông ("Tài khoản được cộng ... credit", có lý do và số dư). Mặc định chỉ chạy thử, không ghi gì.
 *
 *   npm run grant:credit-all -- --amount=2000 --note="Đền bù bảo trì ..."             chạy thử, in số người sẽ nhận
 *   npm run grant:credit-all -- --amount=2000 --note="Đền bù bảo trì ..." --confirm   cộng thật
 *
 * Chạy lại cùng --note chỉ cộng cho người còn thiếu (không cộng trùng). Đổi --note thì được tính là đợt mới.
 * Chỉ chạy một lệnh tại một thời điểm.
 */
import { prisma } from "../src/configs/prisma";
import { CREDIT_GRANT_MAX_AMOUNT, CREDIT_GRANT_NOTE_MAX } from "../src/constants/credit-grant";
import { creditGrantService } from "../src/services/credit-grant.service";
import { parseArgs } from "./lib/cli-args";

const args = parseArgs();

async function main() {
  const amount = args.number("amount");
  const note = args.get("note")?.trim();
  if (amount === undefined || !Number.isInteger(amount) || amount <= 0 || amount > CREDIT_GRANT_MAX_AMOUNT) {
    throw new Error(`--amount must be a positive integer up to ${CREDIT_GRANT_MAX_AMOUNT}`);
  }
  if (!note || note.length > CREDIT_GRANT_NOTE_MAX) throw new Error(`--note is required (1-${CREDIT_GRANT_NOTE_MAX} characters)`);

  const dryRun = !args.has("confirm");
  const r = await creditGrantService.grantToAllActive({ amount, note, dryRun });
  console.log(`${dryRun ? "[dry-run] " : ""}amount=${amount} eligible=${r.eligible} ${dryRun ? "would-grant" : "granted"}=${r.granted} skipped=${r.skipped} failed=${r.failed}`);
  if (dryRun) console.log("Nothing was written. Add --confirm to grant.");
  if (r.failed) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
