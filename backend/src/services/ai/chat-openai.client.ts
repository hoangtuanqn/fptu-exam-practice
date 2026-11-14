import type Anthropic from "@anthropic-ai/sdk";
import { parseExtraHeader } from "../../utils/http-header";

/**
 * Gọi một endpoint tương thích OpenAI Responses API (POST {baseUrl}/responses, stream SSE) cho chatbot Cóc Pass.
 * Mỗi hàm gọi đúng MỘT lượt; vòng công cụ nằm ở chat.service. Lỗi ném ra chỉ chứa mã trạng thái/loại lỗi:
 * không bao giờ đưa khoá, header, nội dung gửi đi hay câu trả lời của máy chủ vào thông báo lỗi hoặc log.
 */

export interface ChatUpstream {
  baseUrl: string;
  model: string;
  apiKey: string;
  extraHeader: string;
}

export interface FunctionCall {
  call_id: string;
  name: string;
  arguments: string;
}

export interface ResponsesTurn {
  status: string; // completed | incomplete
  incompleteReason: string | null;
  calls: FunctionCall[];
  usage: { input: number; output: number; cached: number };
}

const IDLE_TIMEOUT_MS = 60_000; // chờ byte đầu tiên, và giữa hai đoạn stream, tối đa chừng này
const CALL_TIMEOUT_MS = 180_000; // trần cho cả một lượt gọi
const MAX_STREAM_BYTES = 4_000_000; // trần dung lượng một lượt stream

export class ChatUpstreamError extends Error {
  name = "ChatUpstreamError";
}

// Chỉ giữ mã lỗi dạng chữ ngắn (vd. rate_limit_exceeded), không lấy lời nhắn của máy chủ
const code = (v: unknown) => (typeof v === "string" && /^[A-Za-z0-9_.-]{1,60}$/.test(v) ? v : "unknown");

/** Định nghĩa công cụ của Claude (JSON schema) đổi sang function tool của Responses API. */
export const toResponsesTools = (tools: Anthropic.Tool[]) =>
  tools.map((t) => ({ type: "function" as const, name: t.name, description: t.description ?? "", parameters: t.input_schema, strict: false }));

/** Bộ đọc SSE: sự kiện có thể bị cắt ngang giữa các chunk; dòng chú thích (":") và trường khác "data" bị bỏ qua. */
export function createSseParser(onData: (data: string) => void) {
  let buf = "";
  let data: string[] = [];
  const line = (raw: string) => {
    const l = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
    if (l === "") {
      if (data.length) onData(data.join("\n"));
      data = [];
      return;
    }
    if (l.startsWith(":")) return;
    const i = l.indexOf(":");
    const field = i < 0 ? l : l.slice(0, i);
    const value = i < 0 ? "" : l.slice(i + 1).replace(/^ /, "");
    if (field === "data") data.push(value);
  };
  return {
    push(chunk: string) {
      buf += chunk;
      let n: number;
      while ((n = buf.indexOf("\n")) >= 0) {
        line(buf.slice(0, n));
        buf = buf.slice(n + 1);
      }
    },
    end() {
      if (buf) line(buf);
      buf = "";
      line("");
    },
  };
}

interface OutputItem {
  type?: string;
  call_id?: string;
  name?: string;
  arguments?: string;
  content?: { type?: string; text?: string }[];
}
interface FinalResponse {
  status?: string;
  incomplete_details?: { reason?: string } | null;
  output?: OutputItem[];
  usage?: { input_tokens?: number; output_tokens?: number; input_tokens_details?: { cached_tokens?: number } };
}

const isCall = (i: OutputItem): i is OutputItem & FunctionCall => i.type === "function_call" && typeof i.call_id === "string" && typeof i.name === "string";

/** Một lượt gọi stream. onText nhận từng đoạn chữ ngay khi tới. `signal` huỷ khi người dùng đóng khung chat. */
export async function streamResponses(up: ChatUpstream, body: Record<string, unknown>, signal: AbortSignal, onText: (t: string) => void): Promise<ResponsesTurn> {
  const idle = new AbortController();
  let timer = setTimeout(() => idle.abort(), IDLE_TIMEOUT_MS);
  const extra = parseExtraHeader(up.extraHeader);
  try {
    const res = await fetch(`${up.baseUrl}/responses`, {
      method: "POST",
      headers: { ...(extra ? { [extra[0]]: extra[1] } : {}), "Content-Type": "application/json", Accept: "text/event-stream", Authorization: `Bearer ${up.apiKey}` },
      body: JSON.stringify({ ...body, model: up.model, stream: true, store: false }),
      signal: AbortSignal.any([signal, idle.signal, AbortSignal.timeout(CALL_TIMEOUT_MS)]),
      redirect: "error", // không cho chuyển hướng mang khoá sang máy khác
    });
    if (!res.ok || !res.body) {
      await res.body?.cancel().catch(() => undefined);
      throw new ChatUpstreamError(`chat upstream HTTP ${res.status}`);
    }

    let final: FinalResponse | null = null;
    let failure: string | null = null;
    let streamed = false;
    const doneItems: OutputItem[] = [];
    const parser = createSseParser((data) => {
      if (failure || data === "[DONE]") return;
      let ev: { type?: string; delta?: unknown; item?: OutputItem; response?: FinalResponse & { error?: { code?: unknown } }; code?: unknown; error?: { code?: unknown } };
      try {
        ev = JSON.parse(data);
      } catch {
        return; // dòng hỏng: bỏ qua
      }
      if (ev.type === "response.output_text.delta" && typeof ev.delta === "string") {
        streamed = true;
        onText(ev.delta);
      } else if (ev.type === "response.output_item.done" && ev.item) doneItems.push(ev.item);
      // Trạng thái theo loại sự kiện kết thúc: response.incomplete không bao giờ bị coi là đã xong, kể cả khi thiếu status
      else if (ev.type === "response.completed") final = { ...ev.response, status: ev.response?.status ?? "completed" };
      else if (ev.type === "response.incomplete") final = { ...ev.response, status: "incomplete" };
      else if (ev.type === "response.failed") failure = `failed ${code(ev.response?.error?.code)}`;
      else if (ev.type === "error") failure = `error ${code(ev.code ?? ev.error?.code)}`;
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        clearTimeout(timer);
        timer = setTimeout(() => idle.abort(), IDLE_TIMEOUT_MS);
        bytes += value.byteLength;
        if (bytes > MAX_STREAM_BYTES) throw new ChatUpstreamError("chat upstream stream too large");
        parser.push(decoder.decode(value, { stream: true }));
        if (failure) throw new ChatUpstreamError(`chat upstream ${failure}`);
      }
      parser.push(decoder.decode());
      parser.end();
    } finally {
      reader.cancel().catch(() => undefined);
    }
    if (failure) throw new ChatUpstreamError(`chat upstream ${failure}`);
    const resp = final as FinalResponse | null;
    if (!resp) throw new ChatUpstreamError("chat upstream ended without a final event");

    const output = resp.output?.length ? resp.output : doneItems;
    // Endpoint không stream từng đoạn chữ: lấy chữ trong bản cuối
    if (!streamed) for (const item of output) if (item.type === "message") for (const c of item.content ?? []) if (c.type === "output_text" && c.text) onText(c.text);
    const cached = resp.usage?.input_tokens_details?.cached_tokens ?? 0;
    return {
      status: resp.status ?? "incomplete",
      incompleteReason: resp.incomplete_details?.reason ?? null,
      calls: output.filter(isCall).map((c) => ({ call_id: c.call_id, name: c.name, arguments: typeof c.arguments === "string" ? c.arguments : "{}" })),
      // input_tokens của OpenAI đã gồm phần đọc từ cache; tách ra cho khớp cách Claude đếm (input không gồm cache)
      usage: { input: Math.max(0, (resp.usage?.input_tokens ?? 0) - cached), output: resp.usage?.output_tokens ?? 0, cached },
    };
  } catch (err) {
    if (err instanceof ChatUpstreamError) throw err;
    throw new ChatUpstreamError(`chat upstream ${(err as Error)?.name ?? "Error"}`); // lỗi mạng/hết giờ/huỷ: chỉ giữ loại lỗi
  } finally {
    clearTimeout(timer);
  }
}
