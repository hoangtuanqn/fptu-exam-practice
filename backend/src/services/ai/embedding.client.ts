import { EMBEDDING_DIMS, EMBEDDING_MODEL } from "../../constants/chat";

const BASE = "https://generativelanguage.googleapis.com/v1beta";
const TIMEOUT_MS = 20_000;

type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

// Chuẩn hoá về độ dài 1: khi rút gọn chiều (outputDimensionality) Google không tự chuẩn hoá
const normalize = (v: number[]) => {
  const n = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / n);
};

async function call<T>(apiKey: string, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 400 || res.status === 403) throw new Error(`Khoá Gemini không hợp lệ hoặc không có quyền (${res.status})`);
    if (res.status === 429) throw new Error("Hết hạn mức Gemini hoặc gọi quá nhanh (429)");
    throw new Error(`Gemini trả lỗi ${res.status}: ${detail.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

const requestOf = (text: string, taskType: TaskType) => ({
  model: `models/${EMBEDDING_MODEL}`,
  content: { parts: [{ text }] },
  taskType,
  outputDimensionality: EMBEDDING_DIMS,
});

/** Vector của một câu hỏi (dùng khi tìm kiếm). */
export async function embedQuery(apiKey: string, text: string): Promise<number[]> {
  const r = await call<{ embedding: { values: number[] } }>(apiKey, `models/${EMBEDDING_MODEL}:embedContent`, requestOf(text, "RETRIEVAL_QUERY"));
  return normalize(r.embedding.values);
}

/** Vector của nhiều đoạn tài liệu, gọi theo lô (tối đa 100 đoạn mỗi lần). */
export async function embedDocuments(apiKey: string, texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 50) {
    const batch = texts.slice(i, i + 50);
    const r = await call<{ embeddings: { values: number[] }[] }>(apiKey, `models/${EMBEDDING_MODEL}:batchEmbedContents`, {
      requests: batch.map((t) => requestOf(t, "RETRIEVAL_DOCUMENT")),
    });
    if (r.embeddings.length !== batch.length) throw new Error("Gemini trả thiếu vector");
    out.push(...r.embeddings.map((e) => normalize(e.values)));
  }
  return out;
}
