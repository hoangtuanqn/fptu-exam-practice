import http from "node:http";
import { createApp } from "./app";
import { env } from "./configs/env";
import { prisma } from "./configs/prisma";
import { startCrawlWorker } from "./jobs/crawl.worker";
import { knowledgeService } from "./services/knowledge.service";
import { examSolveService } from "./services/exam-solve.service";
import { examRepository } from "./repositories/exam.repository";
import { initRealtime } from "./realtime/socket.server";
import { startSepayCron } from "./jobs/sepay.cron";
import { startReminderCron } from "./jobs/reminder.cron";
import { startSessionCleanup } from "./jobs/session-cleanup.cron";
import { startCreditExpiry } from "./jobs/credit-expiry.cron";
import { startSimilarityCron } from "./jobs/similarity.cron";
import { startMaterialWorker } from "./jobs/material.worker";
import { startMaterialCleanupCron } from "./jobs/material-cleanup.cron";

const server = http.createServer(createApp());
initRealtime(server); // kênh realtime (socket.io) dùng chung cổng với API
server.listen(env.PORT, () => {
  console.log(`Server chạy tại http://localhost:${env.PORT}`);
  // DB chưa sẵn sàng thì API vẫn lên, chỉ cron không khởi động được
  startSepayCron().catch((err) => console.error("Không khởi động được sepay cron:", err.message));
  // Đề cũ chưa có mã môn (cột thêm sau): điền một lần, các lần khởi động sau không còn gì để làm
  examRepository.backfillSubjectCodes().then((n) => n > 0 && console.log(`[db] đã điền mã môn cho ${n} đề`)).catch((err) => console.error("Không điền được mã môn:", err.message));
  startSessionCleanup();
  startCreditExpiry();
  startReminderCron();
  startSimilarityCron(); // lỗi DB (chưa sẵn sàng) được bắt trong từng lượt chạy, API vẫn lên
  startMaterialCleanupCron();
  startMaterialWorker().catch((err) => console.error("Không khởi động được hàng đợi phân tích slide:", err.message));
  // Nạp tài liệu hướng dẫn của chatbot (chỉ tạo embedding cho mục mới/đã sửa nên các lần khởi động sau gần như không tốn gì)
  knowledgeService.reindex().then((r) => console.log(`[chat] tri thức: ${r.total} mục, ${r.embedded} có embedding${r.warning ? ` (${r.warning})` : ""}`)).catch((err) => console.error("[chat] không nạp được tri thức:", err.message));
  startCrawlWorker().catch((err) => console.error("Không khởi động được crawl worker:", err.message));
  examSolveService
    .recoverPending()
    .then((n) => n > 0 && console.log(`[ai] xếp lại ${n} đề đang chờ AI giải`))
    .catch((err) => console.error("Không khôi phục được hàng đợi AI:", err.message));
});

// Tắt êm: ngừng nhận request rồi đóng kết nối DB
const shutdown = () => {
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
