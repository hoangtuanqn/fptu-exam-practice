import { isMailConfigured } from "../configs/mailer";
import { CAMPAIGN_KEYS, CONVERSION_DAYS, MARKETING_RUN_HOUR, STATS_WINDOW_DAYS, type CampaignKey } from "../constants/marketing";
import { marketingRepository } from "../repositories/marketing.repository";
import { DAY_MS, startOfVnDay } from "../utils/time";
import { marketingSettingService } from "./marketing-setting.service";

export interface FunnelRow {
  sent: number; // thư đã đủ CONVERSION_DAYS ngày để ghi nhận kết quả
  clicked: number;
  bought: number;
  returned: number; // chỉ có nghĩa với winback, chiến dịch khác luôn 0
  pending: number; // thư gửi trong CONVERSION_DAYS ngày gần nhất: "đang chờ kết quả"
}

const HOUR_MS = 3_600_000;
const OPT_OUT_RATE_DECIMALS = 4;

// Lượt cron kế tiếp: MARKETING_RUN_HOUR giờ Việt Nam hôm nay, đã qua thì ngày mai
export const nextRunAt = (now: Date) => {
  const today = startOfVnDay(now.getTime()).getTime() + MARKETING_RUN_HOUR * HOUR_MS;
  return new Date(today > now.getTime() ? today : today + DAY_MS);
};

const empty = (): FunnelRow => ({ sent: 0, clicked: 0, bought: 0, returned: 0, pending: 0 });

export const marketingStatsService = {
  async overview(now = new Date()) {
    const since = new Date(now.getTime() - STATS_WINDOW_DAYS * DAY_MS);
    const matured = new Date(now.getTime() - CONVERSION_DAYS * DAY_MS);
    const [sentToday, optOut, paused, rows, params] = await Promise.all([
      marketingRepository.sentSince(CAMPAIGN_KEYS, startOfVnDay(now.getTime())),
      marketingRepository.optOutCounts(),
      marketingSettingService.isPaused(),
      marketingRepository.funnel(CAMPAIGN_KEYS, since, matured),
      marketingSettingService.params(),
    ]);
    const funnel = Object.fromEntries(CAMPAIGN_KEYS.map((k) => [k, empty()])) as Record<CampaignKey, FunnelRow>;
    for (const r of rows) {
      const key = r.campaign as CampaignKey;
      if (!funnel[key]) continue;
      funnel[key] = { sent: Number(r.sent), clicked: Number(r.clicked), bought: Number(r.bought), returned: key === "winback" ? Number(r.returned) : 0, pending: Number(r.pending) };
    }
    return {
      status: {
        sentToday,
        dailyCap: params.dailyCap,
        nextRun: nextRunAt(now).toISOString(),
        smtpConfigured: isMailConfigured,
        optOutRate: optOut.total > 0 ? Number((optOut.optedOut / optOut.total).toFixed(OPT_OUT_RATE_DECIMALS)) : 0,
        paused,
      },
      funnel,
    };
  },
};
