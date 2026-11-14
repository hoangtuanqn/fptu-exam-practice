/**
 * Đổi LaTeX còn sót trong lời giải thích AI đã lưu (question_explanations.content) sang chữ Unicode, bằng utils/plain-math.
 * Duyệt theo id (cursor), mỗi lô một giao dịch nhỏ, chỉ ghi các dòng thực sự đổi; chạy lại bao nhiêu lần cũng được.
 *
 *   npm run fix:explanation-math -- --dry-run     (chỉ đếm, không ghi)
 *   npm run fix:explanation-math
 * Tuỳ chọn: --batch=200 (số dòng mỗi lô, 1 đến 1000)
 */
import { prisma } from "../src/configs/prisma";
import { plainMath } from "../src/utils/plain-math";
import { parseArgs } from "./lib/cli-args";

const args = parseArgs();

async function main() {
  const dryRun = args.has("dry-run");
  const batch = args.number("batch") ?? 200;
  if (!Number.isInteger(batch) || batch < 1 || batch > 1000) throw new Error("--batch must be an integer from 1 to 1000");

  let cursor = 0;
  let scanned = 0;
  let changed = 0;
  for (;;) {
    const rows = await prisma.questionExplanation.findMany({ where: { id: { gt: cursor } }, orderBy: { id: "asc" }, take: batch, select: { id: true, content: true } });
    if (rows.length === 0) break;
    cursor = rows[rows.length - 1]!.id;
    scanned += rows.length;
    const updates = rows.flatMap((r) => {
      const content = plainMath(r.content);
      return content === r.content ? [] : [{ id: r.id, content }];
    });
    changed += updates.length;
    if (!dryRun && updates.length) {
      await prisma.$transaction(updates.map((u) => prisma.questionExplanation.update({ where: { id: u.id }, data: { content: u.content }, select: { id: true } })));
    }
  }
  console.log(`${dryRun ? "[dry-run] " : ""}scanned ${scanned}, ${dryRun ? "would change" : "changed"} ${changed}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
