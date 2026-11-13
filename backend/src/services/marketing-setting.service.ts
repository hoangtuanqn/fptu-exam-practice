import { CAMPAIGN_KEYS, MARKETING_FLAG_CACHE_MS, MARKETING_KEY_PREFIX, type CampaignKey } from "../constants/marketing";
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
};
