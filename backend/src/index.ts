import { createApp } from "./app";
import { env } from "./configs/env";
import { prisma } from "./configs/prisma";
import { startSepayCron } from "./jobs/sepay.cron";

const server = createApp().listen(env.PORT, () => {
  console.log(`Server chạy tại http://localhost:${env.PORT}`);
  // DB chưa sẵn sàng thì API vẫn lên, chỉ cron không khởi động được
  startSepayCron().catch((err) => console.error("Không khởi động được sepay cron:", err.message));
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
