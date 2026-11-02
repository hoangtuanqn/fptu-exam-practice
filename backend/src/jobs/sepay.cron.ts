import cron, { type ScheduledTask } from "node-cron";
import type { SepayConfig } from "../constants/sepay";
import { sepayService } from "../services/sepay.service";
import { settingService } from "../services/setting.service";

let task: ScheduledTask | null = null;

const schedule = async (config: SepayConfig) => {
  await task?.destroy();
  task = null;
  if (!config.cronEnabled) {
    console.log("[sepay-cron] đang tắt");
    return;
  }
  task = cron.schedule(config.cronExpression, async () => {
    try {
      const r = await sepayService.sync();
      if (r.created > 0 || !r.ok) console.log(`[sepay-cron] ${r.message} (mới ${r.created}, khớp ${r.matched})`);
    } catch (err) {
      console.error("[sepay-cron]", (err as Error).message); // đang có lượt khác chạy
    }
  });
  console.log(`[sepay-cron] chạy theo lịch "${config.cronExpression}"`);
};

// Gọi một lần khi khởi động; sau đó admin đổi cấu hình thì lịch tự nạp lại
export const startSepayCron = async () => {
  settingService.onSepayChange((config) => void schedule(config));
  await schedule(await settingService.getSepay());
};
