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

export type ChatConfigInput = Partial<Omit<ChatConfig, "geminiApiKey">> & { geminiApiKey?: string; clearGeminiKey?: boolean };

export const chatSettingService = {
  async get(): Promise<ChatConfig> {
    const raw = await settingRepository.getMany(NAMES.map(keyOf));
    const config = Object.fromEntries(NAMES.map((n) => [n, parse(n, raw[keyOf(n)])])) as unknown as ChatConfig;
    if (!config.geminiApiKey && env.GEMINI_API_KEY) config.geminiApiKey = env.GEMINI_API_KEY; // chưa nhập ở trang quản trị thì dùng .env
    return config;
  },

  // Bản trả cho admin: không lộ khoá
  async getForAdmin() {
    const { geminiApiKey, ...rest } = await this.get();
    return { ...rest, hasGeminiKey: geminiApiKey.length > 0, geminiKeyPreview: geminiApiKey ? `••••${geminiApiKey.slice(-4)}` : "" };
  },

  async update({ geminiApiKey, clearGeminiKey, ...rest }: ChatConfigInput) {
    const entries: Record<string, string> = {};
    for (const [name, value] of Object.entries(rest)) if (value !== undefined) entries[keyOf(name as keyof ChatConfig)] = String(value);
    if (geminiApiKey) entries[keyOf("geminiApiKey")] = geminiApiKey; // để trống = giữ khoá cũ
    else if (clearGeminiKey) entries[keyOf("geminiApiKey")] = "";
    await settingRepository.setMany(entries);
    return this.getForAdmin();
  },
};
