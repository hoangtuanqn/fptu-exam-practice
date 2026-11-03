import { AI_RETRIES, AI_TIMEOUT_MS } from "../../constants/ai";
import { sleep } from "../../utils/sleep";

export type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

export interface GeminiRequest {
  apiKey: string;
  model: string;
  system: string;
  parts: GeminiPart[];
  useSearch: boolean;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; status?: string };
}

// Chỉ thử lại lỗi quá tải tạm thời của máy chủ. 429 (hết hạn mức) thử lại ngay cũng vô ích nên báo luôn.
const RETRYABLE = new Set([500, 502, 503, 504]);

/**
 * Gọi Gemini (REST generateContent) và trả về phần chữ của câu trả lời.
 * Khóa API gửi qua header, không nằm trong URL nên không lọt vào log.
 */
export async function generateContent({ apiKey, model, system, parts, useSearch }: GeminiRequest): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts }],
    ...(useSearch && { tools: [{ googleSearch: {} }] }),
    generationConfig: { temperature: 0.2 },
  });

  let lastError = "";
  for (let attempt = 0; attempt <= AI_RETRIES; attempt++) {
    if (attempt > 0) await sleep(attempt * 8000);
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
        body,
        signal: AbortSignal.timeout(AI_TIMEOUT_MS),
      });
    } catch (err) {
      if ((err as Error).name === "TimeoutError") throw new Error("Gemini phản hồi quá lâu"); // gọi lại chỉ tốn thêm token
      lastError = `Không kết nối được Gemini: ${(err as Error).message}`;
      continue;
    }

    const json = (await res.json().catch(() => null)) as GeminiResponse | null;
    if (!res.ok) {
      lastError = `Gemini trả lỗi ${res.status}: ${json?.error?.message ?? res.statusText}`;
      if (res.status === 429) {
        const wait = json?.error?.message?.match(/retry in ([0-9hms.]+)/i)?.[1];
        throw new Error(`Hết hạn mức Gemini (429)${wait ? `, thử lại sau ${wait.replace(/\.\d+s$/, "s")}` : ""}. Khóa miễn phí không dùng được model Pro: hãy dùng model Flash hoặc bật thanh toán.`);
      }
      if (RETRYABLE.has(res.status)) continue;
      throw new Error(lastError); // sai khóa, sai tên model, ảnh quá lớn...: thử lại cũng vô ích
    }

    if (json?.promptFeedback?.blockReason) throw new Error(`Gemini từ chối nội dung (${json.promptFeedback.blockReason})`);
    const candidate = json?.candidates?.[0];
    // Bỏ phần "suy nghĩ" nội bộ nếu có, chỉ lấy câu trả lời
    const text = (candidate?.content?.parts ?? [])
      .filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("")
      .trim();
    if (!text) throw new Error(`Gemini không trả lời (${candidate?.finishReason ?? "không rõ lý do"})`);
    return text;
  }
  throw new Error(lastError || "Không gọi được Gemini");
}
