import type Anthropic from "@anthropic-ai/sdk";
import { CHAT_EFFORT, CHAT_HISTORY_SENT, CHAT_MAX_OUTPUT_TOKENS, type AiConfig } from "../../constants/ai";
import { buildSystem, resolveModuleKey } from "../../prompts";
import { askClaudeText, type ClaudeContent } from "./claude.client";
import { questionContextBlocks, type ExplainInput } from "./question-explainer.service";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface QuestionChatInput extends Omit<ExplainInput, "commentsText"> {
  explanation: string; // lời giải đã lưu mà người học đã đọc
  messages: ChatMessage[]; // hội thoại đến giờ, tin cuối là của người học
}

/** Chỉ giữ CHAT_HISTORY_SENT tin gần nhất, bắt đầu bằng tin của người học (API cần lượt đầu là user). */
export function trimHistory(messages: ChatMessage[], max = CHAT_HISTORY_SENT): ChatMessage[] {
  const recent = messages.slice(-max);
  const first = recent.findIndex((m) => m.role === "user");
  return first < 0 ? [] : recent.slice(first);
}

/**
 * Trả lời câu hỏi tiếp theo của người học về một câu đã có lời giải. Cùng model với lời giải thích.
 * Cache: system tĩnh (prompts/chat-explain) + khối ngữ cảnh câu hỏi (exam, ảnh, đáp án, lời giải) đứng đầu tin nhắn đầu tiên,
 * breakpoint ở khối cuối của ngữ cảnh. Ngữ cảnh dựng xác định nên các lượt sau của cùng câu đọc lại từ cache.
 */
export async function chatAboutQuestion(config: AiConfig, input: QuestionChatInput, onUsage?: Parameters<typeof askClaudeText>[0]["onUsage"]): Promise<string> {
  if (!config.anthropicApiKey) throw new Error("Chưa cấu hình khóa Anthropic");
  const history = trimHistory(input.messages);
  if (history.at(-1)?.role !== "user") throw new Error("Tin nhắn cuối phải là câu hỏi của người học");

  const context: ClaudeContent[] = [
    ...(await questionContextBlocks(input)),
    { type: "text", text: `<explanation>\n${input.explanation}\n</explanation>`, cache_control: { type: "ephemeral" } },
  ];
  const messages: Anthropic.MessageParam[] = history.map((m, i) => ({
    role: m.role,
    content: i === 0 ? [...context, { type: "text", text: m.content }] : m.content,
  }));

  return askClaudeText({
    apiKey: config.anthropicApiKey,
    model: config.claudeModel,
    effort: CHAT_EFFORT,
    system: buildSystem("chat-explain", resolveModuleKey("chat-explain", { explicit: input.subjectCode, title: input.examTitle })),
    content: [],
    messages,
    maxTokens: CHAT_MAX_OUTPUT_TOKENS,
    onUsage,
  });
}
