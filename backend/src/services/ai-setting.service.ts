import { env } from "../configs/env";
import { AI_DEFAULTS, AI_KEY_PREFIX, type AiConfig } from "../constants/ai";
import { settingRepository } from "../repositories/setting.repository";
import type { UpdateAiBody } from "../rules/requests/setting.request";

const keyOf = (name: keyof AiConfig) => `${AI_KEY_PREFIX}${name}`;
const NAMES = Object.keys(AI_DEFAULTS) as (keyof AiConfig)[];

// Giá trị lưu dạng chuỗi, ép về đúng kiểu theo giá trị mặc định
const parse = (name: keyof AiConfig, raw: string | undefined) => {
  const fallback = AI_DEFAULTS[name];
  if (raw === undefined) return fallback;
  if (typeof fallback === "boolean") return raw === "true";
  return raw;
};

export const aiSettingService = {
  async get(): Promise<AiConfig> {
    const raw = await settingRepository.getMany(NAMES.map(keyOf));
    const config = Object.fromEntries(NAMES.map((n) => [n, parse(n, raw[keyOf(n)])])) as unknown as AiConfig;
    // Chưa nhập khóa trong trang quản trị thì dùng khóa trong .env (nếu có)
    if (!config.anthropicApiKey && env.ANTHROPIC_API_KEY) config.anthropicApiKey = env.ANTHROPIC_API_KEY;
    return config;
  },

  // Bản trả cho admin: không lộ khóa, chỉ báo đã cấu hình hay chưa
  async getForAdmin() {
    const { anthropicApiKey, ...rest } = await this.get();
    return {
      ...rest,
      hasApiKey: anthropicApiKey.length > 0,
      apiKeyPreview: anthropicApiKey ? `••••${anthropicApiKey.slice(-4)}` : "",
    };
  },

  async update(body: UpdateAiBody) {
    const { anthropicApiKey, ...rest } = body;
    const entries: Record<string, string> = {};
    for (const [name, value] of Object.entries(rest)) entries[keyOf(name as keyof AiConfig)] = String(value);
    // Để trống khóa = giữ khóa cũ
    if (anthropicApiKey) entries[keyOf("anthropicApiKey")] = anthropicApiKey;

    await settingRepository.setMany(entries);
    return this.getForAdmin();
  },
};
