/**
 * Nạp lại tri thức của chatbot (backend/knowledge/*.md) và tạo embedding cho đoạn mới hoặc đã đổi.
 *   npm run reindex:knowledge
 * Khoá OpenAI lấy từ trang quản trị, hoặc từ biến môi trường OPENAI_API_KEY khi chạy.
 */
import { prisma } from "../src/configs/prisma";
import { knowledgeService } from "../src/services/knowledge.service";

knowledgeService
  .reindex()
  .then((r) => console.log(`Tri thức: ${r.total} đoạn, cập nhật ${r.updated}, có embedding ${r.embedded}${r.warning ? ` (${r.warning})` : ""}`))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
