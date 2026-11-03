import { createApp } from "./app";
import { env } from "./configs/env";
import { prisma } from "./configs/prisma";
import { startCrawlWorker } from "./jobs/crawl.worker";
import { examSolveService } from "./services/exam-solve.service";
import { startSepayCron } from "./jobs/sepay.cron";

const server = createApp().listen(env.PORT, () => {
  console.log(`Server chạy tại http://localhost:${env.PORT}`);
  // DB chưa sẵn sàng thì API vẫn lên, chỉ cron không khởi động được
  startSepayCron().catch((err) => console.error("Không khởi động được sepay cron:", err.message));
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
