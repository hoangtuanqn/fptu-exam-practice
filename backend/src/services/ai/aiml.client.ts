import { AI_RETRIES, AI_TIMEOUT_MS } from "../../constants/ai";
import { sleep } from "../../utils/sleep";
import type { GeminiPart } from "./gemini.client";

const ENDPOINT = "https://api.aimlapi.com/v1/chat/completions";

export interface ChatRequest {
  apiKey: string;
  model: string;
  system: string;
  parts: GeminiPart[]; // cùng dạng với Gemini: chữ hoặc ảnh base64
}

interface ChatResponse {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  message?: string;
  error?: { message?: string };
}

const RETRYABLE = new Set([500, 502, 503, 504]);

/** Gọi AIMLAPI (giao thức OpenAI chat/completions): ảnh gửi dạng data URL, trả về phần chữ của câu trả lời. */
export async function chatCompletion({ apiKey, model, system, parts }: ChatRequest): Promise<string> {
  const content = parts.map((p) =>
    "text" in p
      ? { type: "text", text: p.text }
      : { type: "image_url", image_url: { url: `data:${p.inlineData.mimeType};base64,${p.inlineData.data}` } },
  );
  const body = JSON.stringify({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content },
    ],
    temperature: 0.2,
  });

  let lastError = "";
  for (let attempt = 0; attempt <= AI_RETRIES; attempt++) {
    if (attempt > 0) await sleep(attempt * 8000);
    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
        body,
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });
    } catch (err) {
      if ((err as Error).name === "TimeoutError") throw new Error("AIMLAPI phản hồi quá lâu");
      lastError = `Không kết nối được AIMLAPI: ${(err as Error).message}`;
      continue;
    }

    const json = (await res.json().catch(() => null)) as ChatResponse | null;
    if (!res.ok) {
      lastError = `AIMLAPI trả lỗi ${res.status}: ${json?.error?.message ?? json?.message ?? res.statusText}`;
      if (RETRYABLE.has(res.status)) continue;
      throw new Error(lastError); // hết tiền (403), sai khóa (401), hết hạn mức (429)...: thử lại vô ích
    }

    const text = json?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error(`AIMLAPI không trả lời (${json?.choices?.[0]?.finish_reason ?? "không rõ lý do"})`);
    return text;
  }
  throw new Error(lastError || "Không gọi được AIMLAPI");
}
