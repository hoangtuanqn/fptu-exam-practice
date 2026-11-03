import { REFERRAL_DEFAULTS, REFERRAL_KEY_PREFIX, type ReferralConfig } from "../constants/referral";
import { settingRepository } from "../repositories/setting.repository";
import type { UpdateReferralBody } from "../rules/requests/setting.request";

const keyOf = (name: keyof ReferralConfig) => `${REFERRAL_KEY_PREFIX}${name}`;
const NAMES = Object.keys(REFERRAL_DEFAULTS) as (keyof ReferralConfig)[];

// Giá trị lưu dạng chuỗi, ép về đúng kiểu theo giá trị mặc định
const parse = (name: keyof ReferralConfig, raw: string | undefined) => {
  const fallback = REFERRAL_DEFAULTS[name];
  if (raw === undefined) return fallback;
  if (typeof fallback === "boolean") return raw === "true";
  return Number.isFinite(Number(raw)) ? Number(raw) : fallback;
};

export const referralSettingService = {
  async get(): Promise<ReferralConfig> {
    const raw = await settingRepository.getMany(NAMES.map(keyOf));
    return Object.fromEntries(NAMES.map((n) => [n, parse(n, raw[keyOf(n)])])) as unknown as ReferralConfig;
  },

  async update(body: UpdateReferralBody) {
    await settingRepository.setMany(Object.fromEntries(Object.entries(body).map(([k, v]) => [keyOf(k as keyof ReferralConfig), String(v)])));
    return this.get();
  },
};
