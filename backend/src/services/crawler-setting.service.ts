import { CRAWLER_DEFAULTS, CRAWLER_KEY_PREFIX, type CrawlerConfig } from "../constants/crawler";
import { settingRepository } from "../repositories/setting.repository";
import type { UpdateCrawlerBody } from "../rules/requests/setting.request";

const keyOf = (name: keyof CrawlerConfig) => `${CRAWLER_KEY_PREFIX}${name}`;
const NAMES = Object.keys(CRAWLER_DEFAULTS) as (keyof CrawlerConfig)[];

export const crawlerSettingService = {
  // Giá trị lưu dạng chuỗi; mọi trường hiện là số
  async get(): Promise<CrawlerConfig> {
    const raw = await settingRepository.getMany(NAMES.map(keyOf));
    return Object.fromEntries(NAMES.map((n) => [n, raw[keyOf(n)] === undefined ? CRAWLER_DEFAULTS[n] : Number(raw[keyOf(n)])])) as unknown as CrawlerConfig;
  },

  getForAdmin() {
    return this.get();
  },

  async update(body: UpdateCrawlerBody) {
    await settingRepository.setMany(Object.fromEntries(Object.entries(body).map(([name, value]) => [keyOf(name as keyof CrawlerConfig), String(value)])));
    return this.getForAdmin();
  },
};
