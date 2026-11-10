import { EMBEDDING_DIMS, EMBEDDING_MODEL } from "../../constants/chat";

const URL = "https://api.openai.com/v1/embeddings";
const TIMEOUT_MS = 30_000;
const MAX_INPUTS = 100; // số đoạn mỗi lần gọi (OpenAI cho tới 2048 đoạn và 300 nghìn token mỗi lần; 100 đoạn giữ lần gọi nhỏ, dễ thử lại)

// Chuẩn hoá về độ dài 1 để so sánh bằng tích vô hướng (cosine)
const normalize = (v: number[]) => {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
};

async function call(apiKey: string, input: string[]): Promise<number[][]> {
  const res = await fetch(URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    // dimensions: rút gọn vector (hỗ trợ ở text-embedding-3) cho nhỏ và tìm nhanh, chất lượng gần như không đổi
    body: JSON.stringify({ model: EMBEDDING_MODEL, input, dimensions: EMBEDDING_DIMS, encoding_format: "float" }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
    const code = body?.error?.code ?? "";
    if (res.status === 401) throw new Error("Khoá OpenAI không hợp lệ (401)");
    if (res.status === 403) throw new Error("Khoá OpenAI không có quyền dùng embedding hoặc không được hỗ trợ ở khu vực này (403)");
    // Hết tiền khác với bị giới hạn tốc độ: hết tiền thì thử lại vô ích nên không dùng chữ "giới hạn tốc độ" (nơi gọi dựa vào đó để thử lại)
    if (res.status === 429 && code === "insufficient_quota") throw new Error("Tài khoản OpenAI đã hết số dư hoặc hạn mức (insufficient_quota). Hãy nạp thêm ở trang Billing của OpenAI");
    if (res.status === 429) throw new Error("OpenAI giới hạn tốc độ, gọi quá nhanh (429)");
    throw new Error(`OpenAI trả lỗi ${res.status}: ${String(body?.error?.message ?? "").slice(0, 200)}`);
  }
  const json = (await res.json()) as { data?: { index: number; embedding: number[] }[] };
  const data = [...(json.data ?? [])].sort((a, b) => a.index - b.index);
  if (data.length !== input.length) throw new Error("OpenAI trả thiếu vector");
  return data.map((d) => d.embedding);
}

// OpenAI từ chối đoạn rỗng
const safe = (t: string) => (t.trim() ? t : " .");

/** Vector của một câu hỏi (dùng khi tìm kiếm). */
export async function embedQuery(apiKey: string, text: string): Promise<number[]> {
  return normalize((await call(apiKey, [safe(text)]))[0]!);
}

/** Vector của nhiều đoạn tài liệu, gọi theo lô. */
export async function embedDocuments(apiKey: string, texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += MAX_INPUTS) out.push(...(await call(apiKey, texts.slice(i, i + MAX_INPUTS).map(safe))).map(normalize));
  return out;
}
