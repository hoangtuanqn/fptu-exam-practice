import { ADS_DEFAULTS, ADS_KEY_PREFIX, type AdsConfig } from "../constants/ads";
import { settingRepository } from "../repositories/setting.repository";
import type { UpdateAdsBody } from "../rules/requests/setting.request";

const keyOf = (name: keyof AdsConfig) => `${ADS_KEY_PREFIX}${name}`;
const NAMES = Object.keys(ADS_DEFAULTS) as (keyof AdsConfig)[];

const parse = <K extends keyof AdsConfig>(name: K, raw: string | undefined): AdsConfig[K] => {
  const fallback = ADS_DEFAULTS[name];
  if (raw === undefined) return fallback;
  return (typeof fallback === "boolean" ? raw === "true" : raw) as AdsConfig[K];
};

export const adSettingService = {
  async get(): Promise<AdsConfig> {
    const raw = await settingRepository.getMany(NAMES.map(keyOf));
    return Object.fromEntries(NAMES.map((n) => [n, parse(n, raw[keyOf(n)])])) as unknown as AdsConfig;
  },

  async update(body: UpdateAdsBody) {
    await settingRepository.setMany(Object.fromEntries(Object.entries(body).map(([k, v]) => [keyOf(k as keyof AdsConfig), String(v)])));
    return this.get();
  },

  /**
   * Bản công khai cho trình duyệt: chỉ những gì cần để quyết định nạp quảng cáo nào. Tắt (hoặc thiếu mã vùng) thì
   * trả về enabled=false và không có mã vùng, nên trình duyệt không nạp gì.
   */
  async publicConfig() {
    const c = await this.get();
    const vignette = c.enabled && c.vignette && c.vignetteZone ? c.vignetteZone : null;
    const inpage = c.enabled && c.inpage && c.inpageZone ? c.inpageZone : null;
    return { enabled: c.enabled && (!!vignette || !!inpage), guests: c.guests, vignette, inpage, directLink: c.enabled ? c.directLink : "" };
  },
};
