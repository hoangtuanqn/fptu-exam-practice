import { LINK_REWARD_DEFAULTS, LINK_REWARD_KEY_PREFIX, type LinkRewardConfig } from "../constants/link-reward";
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

export const linkRewardSettingService = {
  /** Đầy đủ, kể cả token: CHỈ dùng trong máy chủ */
  async get(): Promise<LinkRewardConfig> {
    const raw = await settingRepository.getMany(NAMES.map(keyOf));
    return Object.fromEntries(NAMES.map((n) => [n, parse(n, raw[keyOf(n)])])) as unknown as LinkRewardConfig;
  },

  /** Bản cho admin: không có token, chỉ cho biết đã lưu token hay chưa */
  async getAdmin() {
    const { apiToken, ...rest } = await this.get();
    return { ...rest, hasToken: apiToken.length > 0 };
  },

  async update(body: UpdateLinkRewardBody) {
    const { apiToken, ...rest } = body;
    const entries: Record<string, string> = Object.fromEntries(Object.entries(rest).map(([k, v]) => [keyOf(k as keyof LinkRewardConfig), String(v)]));
    if (apiToken) entries[keyOf("apiToken")] = apiToken; // để trống = giữ token cũ
    await settingRepository.setMany(entries);
    return this.getAdmin();
  },
};
