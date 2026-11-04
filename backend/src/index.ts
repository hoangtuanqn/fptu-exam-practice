import http from "node:http";
import { createApp } from "./app";
import { env } from "./configs/env";
import { prisma } from "./configs/prisma";
import { startCrawlWorker } from "./jobs/crawl.worker";
import { examSolveService } from "./services/exam-solve.service";
import { initRealtime } from "./realtime/socket.server";
import { startSepayCron } from "./jobs/sepay.cron";
import { startSessionCleanup } from "./jobs/session-cleanup.cron";

const server = http.createServer(createApp());
initRealtime(server); // kênh realtime (socket.io) dùng chung cổng với API
server.listen(env.PORT, () => {
  console.log(`Server chạy tại http://localhost:${env.PORT}`);
  // DB chưa sẵn sàng thì API vẫn lên, chỉ cron không khởi động được
  startSepayCron().catch((err) => console.error("Không khởi động được sepay cron:", err.message));
  startSessionCleanup();
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
