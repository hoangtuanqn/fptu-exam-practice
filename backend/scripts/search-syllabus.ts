/**
 * Thử tìm kiếm trong nội dung Syllabus đã lập chỉ mục.
 *   npm run search:syllabus -- "hệ điều hành quản lý bộ nhớ thế nào" [--subject=CSI106] [--limit=5]
 */
import { prisma } from "../src/configs/prisma";
import { syllabusKnowledgeService } from "../src/services/syllabus-knowledge.service";

async function main() {
  const args = process.argv.slice(2);
  const query = args.find((a) => !a.startsWith("--"));
  if (!query) throw new Error('Thiếu câu hỏi.  Ví dụ: npm run search:syllabus -- "môn nào học về mạng máy tính"');
  const subject = args.find((a) => a.startsWith("--subject="))?.slice(10);
  const limit = Number(args.find((a) => a.startsWith("--limit="))?.slice(8)) || 5;
  const hits = await syllabusKnowledgeService.search(query, { subject, limit });
  if (hits.length === 0) console.log("Không có kết quả (chưa có embedding hoặc chưa có khoá OpenAI).");
  for (const h of hits) console.log(`\n${h.score.toFixed(3)}  ${h.slug}\n  ${h.content.split("\n").slice(1, 5).join(" | ").slice(0, 300)}`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
