import { SEASON_DEFAULTS, SEASON_FLAG_CACHE_MS, SEASON_KEY_PREFIX, XMAS_MAIL_END, type SeasonConfig } from "../constants/season";
import { settingRepository } from "../repositories/setting.repository";
import type { UpdateSeasonBody } from "../rules/requests/setting.request";

const keyOf = (name: keyof SeasonConfig) => `${SEASON_KEY_PREFIX}${name}`;
const NAMES = Object.keys(SEASON_DEFAULTS) as (keyof SeasonConfig)[];

// Lưu dạng chuỗi "true"/"false"; chưa lưu thì dùng mặc định
const parse = (name: keyof SeasonConfig, raw: string | undefined) => (raw === undefined ? SEASON_DEFAULTS[name] : raw === "true");

let mailXmasCache: { value: boolean; at: number } | undefined;

export const seasonSettingService = {
  async get(): Promise<SeasonConfig> {
    const raw = await settingRepository.getMany(NAMES.map(keyOf));
    return Object.fromEntries(NAMES.map((n) => [n, parse(n, raw[keyOf(n)])])) as unknown as SeasonConfig;
  },

  async update(body: UpdateSeasonBody) {
    await settingRepository.setMany(Object.fromEntries(Object.entries(body).map(([k, v]) => [keyOf(k as keyof SeasonConfig), String(v)])));
    mailXmasCache = undefined;
    return this.get();
  },

  async isXmasOn() {
    return (await this.get()).xmasEnabled;
  },

  // Thư có dùng ảnh Giáng sinh không: cờ admin (nhớ SEASON_FLAG_CACHE_MS) và chưa quá XMAS_MAIL_END. Lỗi DB thì dùng ảnh thường, không chặn gửi thư.
  async isXmasMailOn(now = Date.now()) {
    if (now >= XMAS_MAIL_END.getTime()) return false;
    if (!mailXmasCache || now - mailXmasCache.at >= SEASON_FLAG_CACHE_MS) mailXmasCache = { value: await this.isXmasOn().catch(() => false), at: now };
    return mailXmasCache.value;
  },
};
