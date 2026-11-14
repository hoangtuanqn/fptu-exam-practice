import {
  CAMPAIGN_KEYS,
  DEFAULT_MARKETING_PARAMS,
  MARKETING_FLAG_CACHE_MS,
  MARKETING_KEY_PREFIX,
  MARKETING_PARAMS_KEY,
  MARKETING_PAUSED_KEY,
  type CampaignKey,
  type MarketingParams,
} from "../constants/marketing";
import { settingRepository } from "../repositories/setting.repository";
import { AppError } from "../rules/error";
import { marketingParamsSchema } from "../rules/requests/marketing.request";
import { TtlCache } from "../utils/ttl-cache";

// Cờ bật/tắt từng chiến dịch marketing, lưu trong bảng settings (marketing.<key>.enabled). Chưa lưu = TẮT.
export type CampaignFlags = Record<CampaignKey, boolean>;

const keyOf = (k: CampaignKey) => `${MARKETING_KEY_PREFIX}${k}.enabled`;
const cache = new TtlCache<"flags", CampaignFlags>(MARKETING_FLAG_CACHE_MS, 1);
const paramsCache = new TtlCache<"params", MarketingParams>(MARKETING_FLAG_CACHE_MS, 1);

// Giá trị đã lưu gộp lên mặc định; JSON hỏng hoặc ngoài giới hạn (vd giới hạn trong code đổi sau khi lưu) thì dùng mặc định
const parseParams = (raw: string | undefined): MarketingParams => {
  let stored: unknown = {};
  try {
    stored = raw ? JSON.parse(raw) : {};
  } catch {
    stored = {};
  }
  const merged = marketingParamsSchema.safeParse({ ...DEFAULT_MARKETING_PARAMS, ...(stored && typeof stored === "object" ? stored : {}) });
  if (merged.success) return merged.data as MarketingParams;
  console.error("[marketing] tham số đã lưu không hợp lệ, dùng mặc định");
  return DEFAULT_MARKETING_PARAMS;
};

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

  /** Tham số chiến dịch đang dùng (đã lưu gộp lên mặc định). */
  params: () => paramsCache.wrap("params", async () => parseParams((await settingRepository.getMany([MARKETING_PARAMS_KEY]))[MARKETING_PARAMS_KEY])),

  /** Sửa một phần tham số; kết quả sau khi gộp sai giới hạn hoặc quan hệ giữa các trường thì 400 và không lưu gì. */
  async setParams(patch: Partial<MarketingParams>) {
    paramsCache.clear(); // gộp lên giá trị mới nhất trong DB
    const merged = marketingParamsSchema.safeParse({ ...(await this.params()), ...patch });
    if (!merged.success) throw new AppError(merged.error.issues[0]?.message ?? "Tham số không hợp lệ", 400);
    await settingRepository.setMany({ [MARKETING_PARAMS_KEY]: JSON.stringify(merged.data) });
    paramsCache.clear();
    return this.params();
  },

  async resetParams() {
    await settingRepository.setMany({ [MARKETING_PARAMS_KEY]: "{}" });
    paramsCache.clear();
    return this.params();
  },
};
