import cron from "node-cron";
import { creditLotService } from "../services/credit-lot.service";

// Every minute: remove unused credit whose lifetime has ended (giftcode credit with a time limit)
export const startCreditExpiry = () => {
  let running = false;
  cron.schedule("* * * * *", async () => {
    if (running) return;
    running = true;
    try {
      const r = await creditLotService.expireDue();
      if (r.lots > 0) console.log(`[credit-expiry] ${r.lots} lô hết hạn, thu hồi ${r.credit} credit`);
    } catch (err) {
      console.error("[credit-expiry]", (err as Error).message);
    } finally {
      running = false;
    }
  });
  console.log("[credit-expiry] chạy mỗi phút");
};
