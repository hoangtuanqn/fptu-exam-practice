/**
 * Thử tìm kiếm nội dung Syllabus bằng đúng pipeline của chatbot (embedding + BM25 + lọc theo môn + xác suất).
 *   npm run search:syllabus -- "CSI106 chấm điểm thế nào"
 *   npm run search:syllabus -- "môn nào có chương Operating System"
 * Khoá OpenAI lấy từ trang quản trị hoặc biến môi trường OPENAI_API_KEY; không có thì chỉ chạy BM25.
 */
import { prisma } from "../src/configs/prisma";
import { chatSettingService } from "../src/services/chat-setting.service";
import { embedQuery } from "../src/services/ai/embedding.client";
import { formatRagContext, syllabusRagService } from "../src/services/syllabus-rag.service";

async function main() {
  const query = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!query) throw new Error('Thiếu câu hỏi.  Ví dụ: npm run search:syllabus -- "môn nào học về mạng máy tính"');
  const key = (await chatSettingService.get()).openaiApiKey;
  const qvec = key ? await embedQuery(key, query).catch(() => null) : null;
  const r = await syllabusRagService.retrieve(query, qvec);
  console.log(`Chế độ: ${r.mode}${r.dense ? " (embedding + BM25)" : " (chỉ BM25)"}, ${r.confident ? "có câu trả lời" : "chưa có câu trả lời"}`);
  for (const h of r.hits) console.log(`  p=${h.p.toFixed(2)} ${h.slug}  (embedding ${h.cos.toFixed(2)}, BM25 ${h.lex.toFixed(2)}${h.kindMatch ? ", đúng ý định" : ""})`);
  console.log("\n" + (formatRagContext(r).slice(0, 1500) || "(không phải câu hỏi về syllabus)"));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
