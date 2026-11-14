import { CAMPAIGN_KEYS, MARKETING_FLAG_CACHE_MS, MARKETING_KEY_PREFIX, MARKETING_PAUSED_KEY, type CampaignKey } from "../constants/marketing";
import { settingRepository } from "../repositories/setting.repository";
import { TtlCache } from "../utils/ttl-cache";

// Cờ bật/tắt từng chiến dịch marketing, lưu trong bảng settings (marketing.<key>.enabled). Chưa lưu = TẮT.
export type CampaignFlags = Record<CampaignKey, boolean>;

const keyOf = (k: CampaignKey) => `${MARKETING_KEY_PREFIX}${k}.enabled`;
const cache = new TtlCache<"flags", CampaignFlags>(MARKETING_FLAG_CACHE_MS, 1);

export const marketingSettingService = {
  flags: () =>
    cache.wrap("flags", async () => {
      const raw = await settingRepository.getMany(CAMPAIGN_KEYS.map(keyOf));
      return Object.fromEntries(CAMPAIGN_KEYS.map((k) => [k, raw[keyOf(k)] === "true"])) as CampaignFlags;
    }),

  async setEnabled(key: CampaignKey, enabled: boolean) {
    await settingRepository.setMany({ [keyOf(key)]: String(enabled) });
    cache.clear();
    return this.flags();
  },

  // Tạm dừng tất cả: không cache để bấm dừng có hiệu lực ngay cả khi cron đang chạy dở
  isPaused: async () => (await settingRepository.getMany([MARKETING_PAUSED_KEY]))[MARKETING_PAUSED_KEY] === "true",

  async setPaused(paused: boolean) {
    await settingRepository.setMany({ [MARKETING_PAUSED_KEY]: String(paused) });
    return paused;
  },
};
