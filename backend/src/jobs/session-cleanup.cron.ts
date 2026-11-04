import cron from "node-cron";
import { practiceSessionService } from "../services/practice-session.service";
import { refreshTokenService } from "../services/refresh-token.service";

// Mỗi đêm 3:45 (giờ máy chủ) xoá các lượt làm bài đã cũ để bảng không phình dần
export const startSessionCleanup = () => {
  cron.schedule("45 3 * * *", async () => {
    try {
      const removed = await practiceSessionService.cleanup();
      if (removed > 0) console.log(`[session-cleanup] đã xoá ${removed} lượt làm bài cũ`);
      const tokens = await refreshTokenService.cleanup(); // phiên đăng nhập hết hạn
      if (tokens > 0) console.log(`[session-cleanup] đã xoá ${tokens} phiên đăng nhập hết hạn`);
    } catch (err) {
      console.error("[session-cleanup]", (err as Error).message);
    }
  });
  console.log("[session-cleanup] chạy 3:45 mỗi đêm");
};
