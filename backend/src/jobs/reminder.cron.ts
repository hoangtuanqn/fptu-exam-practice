import cron from "node-cron";
import { REMINDER_CRON, REMINDER_TIMEZONE } from "../constants/reminder";
import { reminderService } from "../services/reminder.service";

// Mỗi chiều 18:30 (giờ Việt Nam) gửi email nhắc ôn cho người đã chủ động bật
export const startReminderCron = () => {
  cron.schedule(
    REMINDER_CRON,
    async () => {
      try {
        const sent = await reminderService.run();
        if (sent > 0) console.log(`[reminder] đã gửi ${sent} thư nhắc ôn`);
      } catch (err) {
        console.error("[reminder]", (err as Error).message);
      }
    },
    { timezone: REMINDER_TIMEZONE },
  );
  console.log("[reminder] chạy 18:30 mỗi ngày (giờ Việt Nam)");
};
