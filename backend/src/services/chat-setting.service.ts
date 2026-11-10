import { env } from "../configs/env";
import { CHAT_DEFAULTS, CHAT_KEY_PREFIX, type ChatConfig } from "../constants/chat";
import { settingRepository } from "../repositories/setting.repository";

const keyOf = (name: keyof ChatConfig) => `${CHAT_KEY_PREFIX}${name}`;
const NAMES = Object.keys(CHAT_DEFAULTS) as (keyof ChatConfig)[];

// Giá trị lưu dạng chuỗi, ép về đúng kiểu theo giá trị mặc định
const parse = (name: keyof ChatConfig, raw: string | undefined) => {
  const fallback = CHAT_DEFAULTS[name];
  if (raw === undefined) return fallback;
  if (typeof fallback === "boolean") return raw === "true";
  if (typeof fallback === "number") return Number.isFinite(Number(raw)) ? Number(raw) : fallback;
  return raw;
};

export type ChatConfigInput = Partial<Omit<ChatConfig, "openaiApiKey">> & { openaiApiKey?: string; clearOpenaiKey?: boolean };

export const chatSettingService = {
  async get(): Promise<ChatConfig> {
    const raw = await settingRepository.getMany(NAMES.map(keyOf));
    const config = Object.fromEntries(NAMES.map((n) => [n, parse(n, raw[keyOf(n)])])) as unknown as ChatConfig;
    if (!config.openaiApiKey && env.OPENAI_API_KEY) config.openaiApiKey = env.OPENAI_API_KEY; // chưa nhập ở trang quản trị thì dùng .env
    return config;
  },

  // Bản trả cho admin: không lộ khoá
  async getForAdmin() {
    const { openaiApiKey, ...rest } = await this.get();
    return { ...rest, hasOpenaiKey: openaiApiKey.length > 0, openaiKeyPreview: openaiApiKey ? `••••${openaiApiKey.slice(-4)}` : "" };
  },

  async update({ openaiApiKey, clearOpenaiKey, ...rest }: ChatConfigInput) {
    const entries: Record<string, string> = {};
    for (const [name, value] of Object.entries(rest)) if (value !== undefined) entries[keyOf(name as keyof ChatConfig)] = String(value);
    if (openaiApiKey) entries[keyOf("openaiApiKey")] = openaiApiKey; // để trống = giữ khoá cũ
    else if (clearOpenaiKey) entries[keyOf("openaiApiKey")] = "";
    await settingRepository.setMany(entries);
    return this.getForAdmin();
  },
};
