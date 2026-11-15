import { env } from "../configs/env";
import { CHAT_DEFAULTS, CHAT_KEY_PREFIX, type ChatConfig } from "../constants/chat";
import { HTTP_STATUS } from "../constants/httpStatus";
import { settingRepository } from "../repositories/setting.repository";
import { AppError } from "../rules/error";

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

export type ChatConfigInput = Partial<Omit<ChatConfig, "openaiApiKey" | "chatApiKey">> & { openaiApiKey?: string; clearOpenaiKey?: boolean; chatApiKey?: string; clearChatKey?: boolean };

const REQUIRED_FOR_OPENAI = { chatApiKey: "Khóa API" } as const;

const preview = (key: string) => (key ? `••••${key.slice(-4)}` : "");

export const chatSettingService = {
  async get(): Promise<ChatConfig> {
    const raw = await settingRepository.getMany(NAMES.map(keyOf));
    const config = Object.fromEntries(NAMES.map((n) => [n, parse(n, raw[keyOf(n)])])) as unknown as ChatConfig;
    if (!config.openaiApiKey && env.OPENAI_API_KEY) config.openaiApiKey = env.OPENAI_API_KEY; // chưa nhập ở trang quản trị thì dùng .env
    if (config.chatProvider !== "openai") config.chatProvider = "anthropic"; // giá trị lạ trong bảng settings = mặc định
    return config;
  },

  // Bản trả cho admin: không lộ khoá
  async getForAdmin() {
    const { openaiApiKey, chatApiKey, ...rest } = await this.get();
    return { ...rest, hasOpenaiKey: openaiApiKey.length > 0, openaiKeyPreview: preview(openaiApiKey), hasChatKey: chatApiKey.length > 0, chatKeyPreview: preview(chatApiKey) };
  },

  async update({ openaiApiKey, clearOpenaiKey, chatApiKey, clearChatKey, ...rest }: ChatConfigInput) {
    const entries: Record<string, string> = {};
    for (const [name, value] of Object.entries(rest)) if (value !== undefined) entries[keyOf(name as keyof ChatConfig)] = String(value);
    if (openaiApiKey) entries[keyOf("openaiApiKey")] = openaiApiKey; // để trống = giữ khoá cũ
    else if (clearOpenaiKey) entries[keyOf("openaiApiKey")] = "";
    if (chatApiKey) entries[keyOf("chatApiKey")] = chatApiKey;
    else if (clearChatKey) entries[keyOf("chatApiKey")] = "";
    // Bật endpoint ngoài khi còn thiếu khoá API (địa chỉ và model đã có mặc định) (sau khi gộp với cấu hình đã lưu) thì chatbot sẽ tắt ngầm: chặn ngay. Quay về Claude luôn được.
    const current = await this.get();
    const changed = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined)) as Partial<ChatConfig>;
    const next = { ...current, ...changed, chatApiKey: entries[keyOf("chatApiKey")] ?? current.chatApiKey };
    if (next.chatProvider === "openai") {
      const missing = (Object.keys(REQUIRED_FOR_OPENAI) as (keyof typeof REQUIRED_FOR_OPENAI)[]).filter((k) => !next[k]);
      const label = (k: keyof typeof REQUIRED_FOR_OPENAI) => REQUIRED_FOR_OPENAI[k];
      if (missing.length) throw new AppError(`Vui lòng nhập ${missing.map(label).join(", ")} trước khi bật nguồn này`, HTTP_STATUS.BAD_REQUEST, Object.fromEntries(missing.map((k) => [k, `Vui lòng nhập ${label(k)}`])));
    }
    await settingRepository.setMany(entries);
    return this.getForAdmin();
  },
};
