import cron from "node-cron";
import { MARKETING_CRON, MARKETING_TIMEZONE } from "../constants/marketing";
import { marketingCampaignService } from "../services/marketing-campaign.service";

// Mỗi sáng 10:00 (giờ Việt Nam) gửi các chiến dịch email marketing admin đã bật (mặc định tắt hết)
export const startMarketingCron = () => {
  cron.schedule(
    MARKETING_CRON,
    async () => {
      try {
        const sent = await marketingCampaignService.run();
        const total = Object.values(sent).reduce((n, v) => n + v, 0);
        if (total > 0) console.log(`[marketing] đã gửi ${total} thư`, sent);
      } catch (err) {
        console.error("[marketing]", (err as Error).message);
      }
    },
    { timezone: MARKETING_TIMEZONE },
  );
  console.log("[marketing] chạy 10:00 mỗi ngày (giờ Việt Nam)");
};
