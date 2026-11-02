import { SEPAY_DEFAULTS, SEPAY_KEY_PREFIX, type SepayConfig } from "../constants/sepay";
import { settingRepository } from "../repositories/setting.repository";
import type { UpdateSepayBody } from "../rules/requests/setting.request";

type Listener = (config: SepayConfig) => void;
const listeners: Listener[] = [];

const keyOf = (name: keyof SepayConfig) => `${SEPAY_KEY_PREFIX}${name}`;
const NAMES = Object.keys(SEPAY_DEFAULTS) as (keyof SepayConfig)[];

// Giá trị lưu dạng chuỗi, ép về đúng kiểu theo giá trị mặc định
const parse = (name: keyof SepayConfig, raw: string | undefined) => {
  if (raw === undefined) return SEPAY_DEFAULTS[name];
  const fallback = SEPAY_DEFAULTS[name];
  if (typeof fallback === "boolean") return raw === "true";
  if (typeof fallback === "number") return Number(raw);
  return raw;
};

export const settingService = {
  async getSepay(): Promise<SepayConfig> {
    const raw = await settingRepository.getMany(NAMES.map(keyOf));
    return Object.fromEntries(NAMES.map((n) => [n, parse(n, raw[keyOf(n)])])) as unknown as SepayConfig;
  },

  // Bản trả cho admin: không lộ token, chỉ báo đã cấu hình hay chưa
  async getSepayForAdmin() {
    const { apiToken, ...rest } = await this.getSepay();
    return { ...rest, hasApiToken: apiToken.length > 0, apiTokenPreview: apiToken ? `••••${apiToken.slice(-4)}` : "" };
  },

  async updateSepay(body: UpdateSepayBody) {
    const { apiToken, ...rest } = body;
    const entries: Record<string, string> = {};
    for (const [name, value] of Object.entries(rest)) entries[keyOf(name as keyof SepayConfig)] = String(value);
    // Để trống token = giữ token cũ
    if (apiToken) entries[keyOf("apiToken")] = apiToken;

    await settingRepository.setMany(entries);
    const config = await this.getSepay();
    listeners.forEach((fn) => fn(config)); // cho cron job nạp lại lịch
    return this.getSepayForAdmin();
  },

  onSepayChange: (fn: Listener) => void listeners.push(fn),
};
