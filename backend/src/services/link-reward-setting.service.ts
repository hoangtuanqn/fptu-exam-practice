import { LINK_REWARD_DEFAULTS, LINK_REWARD_KEY_PREFIX, type LinkProvider, type LinkRewardConfig } from "../constants/link-reward";
import { settingRepository } from "../repositories/setting.repository";
import type { UpdateLinkRewardBody } from "../rules/requests/setting.request";

const keyOf = (name: keyof LinkRewardConfig) => `${LINK_REWARD_KEY_PREFIX}${name}`;
const NAMES = Object.keys(LINK_REWARD_DEFAULTS) as (keyof LinkRewardConfig)[];

const parse = <K extends keyof LinkRewardConfig>(name: K, raw: string | undefined): LinkRewardConfig[K] => {
  const fallback = LINK_REWARD_DEFAULTS[name];
  if (raw === undefined) return fallback;
  if (typeof fallback === "boolean") return (raw === "true") as LinkRewardConfig[K];
  if (typeof fallback === "number") return (Number.isFinite(Number(raw)) ? Number(raw) : fallback) as LinkRewardConfig[K];
  return raw as LinkRewardConfig[K];
};

/** Cấu hình của từng dịch vụ vượt link: đang dùng được hay không, token, số lượt tối đa mỗi người mỗi ngày */
export function providerConfig(cfg: LinkRewardConfig, provider: LinkProvider) {
  if (provider === "link4m") return { active: cfg.enabled && cfg.link4mEnabled && cfg.apiToken !== "", token: cfg.apiToken, dailyLimit: cfg.dailyLimit, turns: cfg.link4mTurns };
  return { active: cfg.enabled && cfg.shrinkmeEnabled && cfg.shrinkmeToken !== "", token: cfg.shrinkmeToken, dailyLimit: cfg.shrinkmeDailyLimit, turns: cfg.shrinkmeTurns };
}

export const linkRewardSettingService = {
  /** Đầy đủ, kể cả token: CHỈ dùng trong máy chủ */
  async get(): Promise<LinkRewardConfig> {
    const raw = await settingRepository.getMany(NAMES.map(keyOf));
    return Object.fromEntries(NAMES.map((n) => [n, parse(n, raw[keyOf(n)])])) as unknown as LinkRewardConfig;
  },

  /** Bản cho admin: không có token, chỉ cho biết đã lưu token hay chưa */
  async getAdmin() {
    const { apiToken, shrinkmeToken, ...rest } = await this.get();
    return { ...rest, hasToken: apiToken.length > 0, hasShrinkmeToken: shrinkmeToken.length > 0 };
  },

  async update(body: UpdateLinkRewardBody) {
    const { apiToken, shrinkmeToken, ...rest } = body;
    const entries: Record<string, string> = {};
    for (const [k, v] of Object.entries(rest)) if (v !== undefined) entries[keyOf(k as keyof LinkRewardConfig)] = String(v); // trường không gửi lên thì giữ nguyên
    if (apiToken) entries[keyOf("apiToken")] = apiToken; // để trống = giữ token cũ
    if (shrinkmeToken) entries[keyOf("shrinkmeToken")] = shrinkmeToken;
    await settingRepository.setMany(entries);
    return this.getAdmin();
  },
};
