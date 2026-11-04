import { EXPLAIN_EFFORT, EXPLAIN_MAX_OUTPUT_TOKENS, type AiConfig } from "../../constants/ai";
import { buildSystem, resolveModuleKey } from "../../prompts";
import { askClaudeText, type ClaudeContent } from "./claude.client";
import { loadImageForAi } from "./image";

export interface ExplainInput {
  examTitle: string;
  questionNumber: number;
  imageFile: string; // đường dẫn tuyệt đối tới ảnh câu hỏi
  correctAnswer: string; // ví dụ "C" hoặc "A C"
  commentsText: string | null; // bình luận của câu này (đã rút gọn), nếu có
}

/** Nhờ Claude giải thích một câu hỏi (ảnh + đáp án chính thức + bình luận nếu có). Trả về văn bản tiếng Việt. */
export async function explainQuestion(config: AiConfig, input: ExplainInput): Promise<string> {
  if (!config.anthropicApiKey) throw new Error("Chưa cấu hình khóa Anthropic");
  const image = await loadImageForAi(input.imageFile);

  const content: ClaudeContent[] = [
    { type: "text", text: `<exam>\nTitle: ${input.examTitle || "(unknown)"}\nQuestion number: ${input.questionNumber}\n</exam>` },
    { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
    { type: "text", text: `<correct_answer>${input.correctAnswer}</correct_answer>` },
  ];
  if (input.commentsText) content.push({ type: "text", text: `<comments>\n${input.commentsText}\n</comments>` });
  content.push({ type: "text", text: "Explain this question following your instructions." });

  return askClaudeText({
    apiKey: config.anthropicApiKey,
    model: config.claudeModel,
    effort: EXPLAIN_EFFORT,
    // Bộ prompt riêng của việc giải thích một câu (prompts/explain), chọn module theo mã môn ở đầu tiêu đề đề thi
    system: buildSystem("explain", resolveModuleKey("explain", { title: input.examTitle })),
    content,
    maxTokens: EXPLAIN_MAX_OUTPUT_TOKENS,
  });
}
