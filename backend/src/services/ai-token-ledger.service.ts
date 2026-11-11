import { MATERIAL_FEATURE, MATERIAL_TOKENS_PER_WINDOW, MATERIAL_WINDOW_MS } from "../constants/materials";
import { aiTokenUsageRepository, type TokenUsageInput } from "../repositories/ai-token-usage.repository";
import { availableAt, windowStart, windowStatus, type TokenEntry, type WindowStatus } from "../utils/token-window";

// Sổ token AI theo tính năng: ghi số token Claude báo về sau MỖI lần gọi, và tính phần còn lại trong cửa sổ trượt.
// Dùng chung được cho tính năng AI khác (mỗi tính năng một `feature`, giới hạn và cửa sổ riêng); hiện chỉ "Phân tích slide" dùng.

export interface TokenLedgerStore {
  record(u: TokenUsageInput): Promise<unknown>;
  since(userId: number, feature: string, since: Date): Promise<TokenEntry[]>;
}

export interface TokenUsageCounts {
  input: number;
  output: number;
  cacheCreation: number;
}

export interface TokenLedger {
  readonly limit: number;
  status(userId: number, now?: Date): Promise<WindowStatus>;
  /** Sớm nhất lúc nào còn đủ `needed` token (null: lớn hơn cả giới hạn). */
  availableAt(userId: number, needed: number, now?: Date): Promise<Date | null>;
  record(userId: number, usage: TokenUsageCounts): Promise<void>;
}

export function createTokenLedger({ feature, limit, windowMs, store }: { feature: string; limit: number; windowMs: number; store: TokenLedgerStore }): TokenLedger {
  const entries = (userId: number, now: Date) => store.since(userId, feature, windowStart(now, windowMs));
  return {
    limit,
    async status(userId, now = new Date()) {
      return windowStatus(await entries(userId, now), limit, windowMs, now);
    },
    async availableAt(userId, needed, now = new Date()) {
      return availableAt(await entries(userId, now), limit, windowMs, needed, now);
    },
    async record(userId, { input, output, cacheCreation }) {
      const inputTokens = Math.max(0, input + cacheCreation);
      const outputTokens = Math.max(0, output);
      await store.record({ userId, feature, inputTokens, outputTokens, totalTokens: inputTokens + outputTokens });
    },
  };
}

export const materialTokenLedger = createTokenLedger({ feature: MATERIAL_FEATURE, limit: MATERIAL_TOKENS_PER_WINDOW, windowMs: MATERIAL_WINDOW_MS, store: aiTokenUsageRepository });
