import { isMailConfigured } from "../configs/mailer";
import { CAMPAIGN_KEYS, CONVERSION_DAYS, MARKETING_RUN_HOUR, STATS_WINDOW_DAYS, isBroadcast, type CampaignKey } from "../constants/marketing";
import { marketingRepository } from "../repositories/marketing.repository";
import type { ListLogsQuery } from "../rules/requests/marketing.request";
import { toSkipTake } from "../utils/pagination";
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
      marketingRepository.sentSince(startOfVnDay(now.getTime())),
      marketingRepository.optOutCounts(),
      marketingSettingService.isPaused(),
      marketingRepository.funnel(since, matured),
      marketingSettingService.params(),
    ]);
    // `broadcast` cộng mọi thư gửi thủ công (mỗi đợt một dòng trong kết quả truy vấn)
    const funnel = Object.fromEntries([...CAMPAIGN_KEYS, "broadcast"].map((k) => [k, empty()])) as Record<CampaignKey | "broadcast", FunnelRow>;
    for (const r of rows) {
      const key = isBroadcast(r.campaign) ? "broadcast" : (r.campaign as CampaignKey);
      const row = funnel[key];
      if (!row) continue;
      row.sent += Number(r.sent);
      row.clicked += Number(r.clicked);
      row.bought += Number(r.bought);
      row.returned += key === "winback" ? Number(r.returned) : 0;
      row.pending += Number(r.pending);
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

  /** Nhật ký thư đã gửi, mới nhất trước; `to` gồm cả ngày đó. Mua Pro theo cùng quy tắc last-touch 7 ngày với phễu. */
  logs(q: ListLogsQuery) {
    return marketingRepository.logs({ ...toSkipTake(q), campaign: q.campaign, from: q.from, to: q.to && new Date(q.to.getTime() + DAY_MS), email: q.email });
  },
};
