import { BASE, ApiError, http, refreshAccessToken, tokenStore } from "@/shared/api/client";
import { getGuestId } from "@/shared/api/guest";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface StreamHandlers {
  onDelta: (text: string) => void;
  onStatus?: (text: string) => void; // máy chủ đang tra cứu dữ liệu cho người dùng
  signal?: AbortSignal;
}

// Gửi yêu cầu stream; token hết hạn (401) thì làm mới một lần rồi gửi lại, giống các API khác
async function open(messages: ChatMessage[], signal: AbortSignal | undefined, retried = false): Promise<Response> {
  const token = tokenStore.get();
  const res = await fetch(`${BASE}/chat/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream", "X-Guest-Id": getGuestId(), ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify({ messages }),
    credentials: "include",
    signal,
  });
  if (res.status === 401 && token && !retried && (await refreshAccessToken()) === "ok") return open(messages, signal, true);
  return res;
}

export const chatApi = {
  config: () => http.get<{ enabled: boolean }>("/chat/config"),

  /**
   * Hỏi trợ lý và nhận câu trả lời dạng stream (SSE): từng đoạn chữ gọi onDelta ngay khi tới.
   * Lỗi (chatbot tắt, hỏi quá nhanh, đứt giữa chừng) ném ApiError/Error với lời nhắn tiếng Việt.
   */
  async askStream(messages: ChatMessage[], { onDelta, onStatus, signal }: StreamHandlers): Promise<void> {
    let res: Response;
    try {
      res = await open(messages, signal);
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      throw new ApiError("Không kết nối được máy chủ", 0);
    }
    if (!res.ok || !res.body) {
      const json = (await res.json().catch(() => null)) as { message?: string } | null;
      throw new ApiError(json?.message ?? `Lỗi ${res.status}`, res.status);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finished = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      // Mỗi sự kiện kết thúc bằng một dòng trống
      let end: number;
      while ((end = buffer.indexOf("\n\n")) >= 0) {
        const line = buffer.slice(0, end).trim();
        buffer = buffer.slice(end + 2);
        if (!line.startsWith("data:")) continue;
        const ev = JSON.parse(line.slice(5)) as { t: "delta"; text: string } | { t: "status"; text: string } | { t: "done" } | { t: "error"; message: string };
        if (ev.t === "delta") onDelta(ev.text);
        else if (ev.t === "status") onStatus?.(ev.text);
        else if (ev.t === "done") {
          finished = true;
        } else throw new ApiError(ev.message, 503);
      }
    }
    if (!finished) throw new ApiError("Kết nối bị gián đoạn, bạn thử lại nhé", 0);
  },
};
