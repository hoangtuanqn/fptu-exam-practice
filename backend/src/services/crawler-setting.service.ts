import { CRAWLER_DEFAULTS, CRAWLER_KEY_PREFIX, type CrawlerConfig } from "../constants/crawler";
import { settingRepository } from "../repositories/setting.repository";
import type { UpdateCrawlerBody } from "../rules/requests/setting.request";

const keyOf = (name: keyof CrawlerConfig) => `${CRAWLER_KEY_PREFIX}${name}`;
const NAMES = Object.keys(CRAWLER_DEFAULTS) as (keyof CrawlerConfig)[];

// Giá trị lưu dạng chuỗi, ép về đúng kiểu theo giá trị mặc định
const parse = (name: keyof CrawlerConfig, raw: string | undefined) => {
  const fallback = CRAWLER_DEFAULTS[name];
  if (raw === undefined) return fallback;
  return typeof fallback === "number" ? Number(raw) : raw;
};

export const crawlerSettingService = {
  async get(): Promise<CrawlerConfig> {
    const raw = await settingRepository.getMany(NAMES.map(keyOf));
    return Object.fromEntries(NAMES.map((n) => [n, parse(n, raw[keyOf(n)])])) as unknown as CrawlerConfig;
  },

  // Bản trả cho admin: không lộ cookie, chỉ báo đã cấu hình hay chưa
  async getForAdmin() {
    const { cookie, loginPassword, ...rest } = await this.get();
    return {
      ...rest,
      hasCookie: cookie.length > 0,
      cookiePreview: cookie ? `••••${cookie.slice(-6)}` : "",
      hasLoginPassword: loginPassword.length > 0, // mật khẩu không bao giờ trả ra ngoài
    };
  },

  async update(body: UpdateCrawlerBody) {
    const { cookie, loginPassword, ...rest } = body;
    const entries: Record<string, string> = {};
    for (const [name, value] of Object.entries(rest)) entries[keyOf(name as keyof CrawlerConfig)] = String(value);
    // Để trống cookie = giữ cookie cũ
    if (cookie) entries[keyOf("cookie")] = cookie;
    // Để trống mật khẩu = giữ mật khẩu cũ
    if (loginPassword) entries[keyOf("loginPassword")] = loginPassword;

    await settingRepository.setMany(entries);
    return this.getForAdmin();
  },
};
