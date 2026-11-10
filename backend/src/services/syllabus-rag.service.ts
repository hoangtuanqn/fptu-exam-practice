import { prisma } from "../configs/prisma";
import { EMBEDDING_DIMS, EMBEDDING_MODEL } from "../constants/chat";
import { RAG_MIN_CHUNKS, KIND_INTENT, KIND_LABEL, RAG_CROSS_SUBJECTS, RAG_MAX_CHUNKS, RAG_MAX_CONTEXT_CHARS, RAG_POOL, RAG_SNIPPET_CHARS, RAG_WEIGHTS, SYLLABUS_WORDS, type RagWeights, type SyllabusKind } from "../constants/rag";
import { dotF32, fromBytes } from "../utils/vector";
import { fold, terms } from "./knowledge.service";

/**
 * RAG nhiều đường cho nội dung Syllabus:
 *  1. Phân tích câu hỏi: mã môn (lọc theo môn), ý định (ưu tiên đúng phần như "cách đánh giá", "giáo trình").
 *  2. Tìm song song: embedding (hiểu nghĩa) và BM25 (đúng từ, mã, thuật ngữ); có mã môn thì chỉ xét các đoạn của môn đó.
 *  3. Đổi các tín hiệu thành xác suất "đoạn này trả lời được câu hỏi" (hồi quy logistic, hệ số học từ bộ câu hỏi mẫu).
 *  4. Chọn đoạn đủ xác suất; đoạn tốt nhất không đạt ngưỡng thì báo "chưa có thông tin" để chatbot không bịa.
 * Không có khoá OpenAI (không tạo được vector câu hỏi) thì chạy bằng BM25 với bộ hệ số riêng.
 */

// Chữ của đoạn KHÔNG giữ trong RAM (12 MB chữ + chỉ mục vượt trần heap 320 MB của máy chủ): chỉ giữ vector và chỉ mục, chữ tải theo yêu cầu cho vài đoạn tốt nhất
interface Doc {
  slug: string;
  subject: string;
  kind: SyllabusKind;
  title: string;
  vec: Float32Array | null;
}
const CONTENT_TOP = 12; // số đoạn tốt nhất được tải chữ (đủ cho RAG_MAX_CHUNKS và danh sách môn)
interface Index {
  docs: Doc[];
  bySubject: Map<string, number[]>;
  post: Map<string, { d: Int32Array; f: Uint16Array }>;
  len: Float32Array;
  avg: number;
  codes: string[];
}

const BM25_K1 = 1.5;
const BM25_B = 0.75;
const TITLE_WEIGHT = 2;

let index: Index | null = null;
let loading: Promise<Index> | null = null;

const BUILD_BATCH = 250; // đọc từng lô để đỉnh bộ nhớ nhỏ

// Cặp từ chỉ xuất hiện trong đúng một đoạn gần như không giúp tìm kiếm nhưng chiếm phần lớn bộ nhớ của chỉ mục: lượt đếm đầu (mảng băm 16 MB) loại chúng
const HASH_BITS = 24;
const hash = (t: string) => {
  let h = 2166136261;
  for (let i = 0; i < t.length; i++) h = Math.imul(h ^ t.charCodeAt(i), 16777619);
  return (h >>> 0) & ((1 << HASH_BITS) - 1);
};

async function countBigrams(): Promise<Uint8Array> {
  const df = new Uint8Array(1 << HASH_BITS);
  let last = 0;
  for (;;) {
    const rows = await prisma.subjectChunk.findMany({ where: { id: { gt: last } }, orderBy: { id: "asc" }, take: BUILD_BATCH, select: { id: true, title: true, content: true } });
    if (rows.length === 0) break;
    for (const r of rows) {
      last = r.id;
      for (const t of new Set([...terms(r.content), ...terms(r.title)])) if (t.includes(" ")) {
        const h = hash(t);
        if (df[h]! < 2) df[h] = df[h]! + 1;
      }
    }
  }
  return df;
}

async function build(): Promise<Index> {
  const bigramDf = await countBigrams();
  const keep = (t: string) => !t.includes(" ") || bigramDf[hash(t)]! >= 2;
  const docs: Doc[] = [];
  const bySubject = new Map<string, number[]>();
  const tmp = new Map<string, number[]>(); // term -> [doc, tf, doc, tf, ...]
  const lens: number[] = [];
  let last = 0;
  for (;;) {
    const rows = await prisma.subjectChunk.findMany({ where: { id: { gt: last } }, orderBy: { id: "asc" }, take: BUILD_BATCH, select: { id: true, slug: true, subjectCode: true, kind: true, title: true, content: true, embedding: true, model: true } });
    if (rows.length === 0) break;
    for (const r of rows) {
      last = r.id;
      const i = docs.length;
      // Chỉ dùng vector do mô hình hiện tại tạo (vector của mô hình khác không so sánh được)
      let vec = r.embedding && r.model === EMBEDDING_MODEL ? fromBytes(r.embedding) : null;
      if (vec && vec.length !== EMBEDDING_DIMS) vec = null;
      docs.push({ slug: r.slug, subject: r.subjectCode, kind: r.kind as SyllabusKind, title: r.title, vec });
      const list = bySubject.get(r.subjectCode);
      if (list) list.push(i);
      else bySubject.set(r.subjectCode, [i]);
      const tf = new Map<string, number>();
      for (const t of terms(r.content)) if (keep(t)) tf.set(t, (tf.get(t) ?? 0) + 1);
      for (const t of terms(r.title)) if (keep(t)) tf.set(t, (tf.get(t) ?? 0) + TITLE_WEIGHT);
      let total = 0;
      for (const [t, f] of tf) {
        total += f;
        const arr = tmp.get(t);
        if (arr) arr.push(i, f);
        else tmp.set(t, [i, f]);
      }
      lens.push(total);
    }
  }
  const len = Float32Array.from(lens);
  const post = new Map<string, { d: Int32Array; f: Uint16Array }>();
  for (const [t, arr] of tmp) {
    const n = arr.length / 2;
    const d = new Int32Array(n);
    const f = new Uint16Array(n);
    for (let j = 0; j < n; j++) {
      d[j] = arr[2 * j]!;
      f[j] = Math.min(65535, arr[2 * j + 1]!);
    }
    post.set(t, { d, f });
    tmp.delete(t); // giải phóng dần, không giữ hai bản cùng lúc
  }
  const avg = len.reduce((x, y) => x + y, 0) / Math.max(1, docs.length);
  return { docs, bySubject, post, len, avg, codes: [...bySubject.keys()].sort() };
}

async function getIndex(): Promise<Index> {
  if (index) return index;
  return (loading ??= build().then((i) => ((index = i), (loading = null), i)));
}

// ---------------------------------------------------------------- phân tích câu hỏi
// Mã môn: 2-4 chữ cái, 3 chữ số, tối đa 2 chữ cái cuối (PRO192, ADA201c). Hai biểu thức riêng vì regex có cờ g nhớ vị trí tìm lần trước,
// dùng chung giữa hàm kiểm tra nhanh và hàm phân tích sẽ làm lỡ mã môn (lỗi khó thấy).
const CODE_TEST = /\b[a-z]{2,4}[\s_-]?\d{3}[a-z]{0,2}\b/i;
const codeMatches = (q: string) => q.matchAll(/\b([a-z]{2,4})[\s_-]?(\d{3})([a-z]{0,2})\b/gi);

/** Câu hỏi có vẻ hỏi về syllabus (nhắc mã môn hoặc từ khoá như "tín chỉ", "giáo trình")? Kiểm tra nhanh, không cần nạp dữ liệu. */
export function mightBeSyllabus(question: string) {
  return CODE_TEST.test(question) || SYLLABUS_WORDS.test(fold(question));
}

export function analyze(question: string, knownCodes: string[]) {
  const matched = new Set<string>();
  const unknown = new Set<string>();
  for (const m of codeMatches(question)) {
    const code = `${m[1]}${m[2]}${m[3]}`.toUpperCase();
    // Nhập ADA201 thì lấy cả ADA201 và ADA201C (thêm tối đa 2 chữ cái cuối), giống cách tiện ích crawl FLM
    const hits = knownCodes.filter((k) => k === code || (k.startsWith(code) && /^[A-Z]{1,2}$/.test(k.slice(code.length))));
    if (hits.length) hits.forEach((h) => matched.add(h));
    else unknown.add(code);
  }
  const f = fold(question);
  const kinds = new Set<SyllabusKind>(KIND_INTENT.filter(([, re]) => re.test(f)).map(([k]) => k));
  return { subjects: [...matched], unknownCodes: [...unknown], kinds, syllabusish: matched.size > 0 || unknown.size > 0 || SYLLABUS_WORDS.test(f) };
}

// ---------------------------------------------------------------- tìm kiếm
export interface RagHit {
  slug: string;
  subject: string;
  kind: SyllabusKind;
  title: string;
  content: string;
  /** Xác suất đoạn này trả lời được câu hỏi (0 đến 1) */
  p: number;
  cos: number;
  lex: number;
  kindMatch: boolean;
}
export interface RagResult {
  suggestions: string[]; // mã môn gần giống mã người dùng gõ mà không có trong dữ liệu (gõ nhầm một ký tự)
  mode: "none" | "subject" | "cross";
  subjects: string[];
  unknownCodes: string[];
  hits: RagHit[];
  /** Đoạn tốt nhất đạt ngưỡng "có câu trả lời" */
  confident: boolean;
  dense: boolean;
}

/**
 * BM25 của câu hỏi với mọi đoạn. `denom` là điểm tối đa có thể (mọi từ của câu hỏi đều xuất hiện đủ nhiều): chia cho nó ra "tỉ lệ thông tin của câu hỏi
 * mà đoạn này bao phủ" (0 đến 1), không phụ thuộc đoạn nào khác trong nhóm, nên câu hỏi không có đáp án thì mọi đoạn đều thấp.
 */
function bm25(idx: Index, query: string, drop: string[] = []): { scores: Float32Array; denom: number } {
  const scores = new Float32Array(idx.docs.length);
  const N = idx.docs.length;
  let denom = 0;
  for (const t of new Set(terms(query))) {
    if (drop.some((c) => t.includes(c))) continue; // đã lọc theo mã môn thì mã không còn giúp phân biệt đoạn
    const p = idx.post.get(t);
    const n = p?.d.length ?? 0;
    const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5)); // từ không có trong tài liệu nào vẫn tính nặng: câu có từ lạ không được coi là khớp
    denom += idf * (BM25_K1 + 1);
    if (!p) continue;
    for (let j = 0; j < n; j++) {
      const d = p.d[j]!;
      const f = p.f[j]!;
      scores[d] = scores[d]! + idf * ((f * (BM25_K1 + 1)) / (f + BM25_K1 * (1 - BM25_B + (BM25_B * idx.len[d]!) / idx.avg)));
    }
  }
  return { scores, denom: Math.max(denom, 1e-9) };
}

const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
export const probability = (w: RagWeights, f: { cos: number; lex: number; kind: boolean }) => sigmoid(w.b + w.dense * f.cos + w.lex * f.lex + w.kind * (f.kind ? 1 : 0));

const topIdx = (scores: ArrayLike<number>, pool: number[], k: number) => [...pool].filter((i) => scores[i]! > 0).sort((a, b) => scores[b]! - scores[a]!).slice(0, k);

/** Mọi đoạn ứng viên kèm các tín hiệu và xác suất, xếp theo xác suất giảm dần. `weights` để eval.ts thử hệ số khác. */
export async function candidates(question: string, qvec: number[] | null, weights?: RagWeights, opts: { allContent?: boolean } = {}) {
  const idx = await getIndex();
  const a = analyze(question, idx.codes);
  const dense = !!qvec && qvec.length === EMBEDDING_DIMS;
  const q = dense ? Float32Array.from(qvec!) : null;
  const mode: RagResult["mode"] = !a.syllabusish ? "none" : a.subjects.length || a.unknownCodes.length ? "subject" : "cross";
  if (mode === "none") return { a, idx, mode, dense, list: [] as RagHit[], w: RAG_WEIGHTS.cross.lexical };
  const w = weights ?? RAG_WEIGHTS[mode === "subject" ? "subject" : "cross"][dense ? "hybrid" : "lexical"];

  const { scores: lex, denom } = bm25(idx, question, mode === "subject" ? [...a.subjects, ...a.unknownCodes].map((c) => c.toLowerCase()) : []);
  const cosOf = (i: number) => (q && idx.docs[i]!.vec ? dotF32(q, idx.docs[i]!.vec!) : 0);
  let pool: number[];
  if (mode === "subject") pool = a.subjects.flatMap((s) => idx.bySubject.get(s) ?? []);
  else {
    const all = idx.docs.map((_, i) => i);
    const cosAll = q ? Float32Array.from(all, cosOf) : null;
    pool = [...new Set([...topIdx(lex, all, RAG_POOL), ...(cosAll ? topIdx(cosAll, all, RAG_POOL) : [])])];
  }
  const scored = pool
    .map((i) => {
      const d = idx.docs[i]!;
      const cos = cosOf(i);
      const lx = Math.min(1, lex[i]! / denom);
      const kindMatch = a.kinds.has(d.kind);
      return { slug: d.slug, subject: d.subject, kind: d.kind, title: d.title, p: probability(w, { cos, lex: lx, kind: kindMatch }), cos, lex: lx, kindMatch };
    })
    .sort((x, y) => y.p - x.p);
  // Chữ chỉ tải cho các đoạn tốt nhất (hoặc tất cả khi script đo cần)
  const keep = opts.allContent ? scored : scored.slice(0, CONTENT_TOP);
  const text = new Map((await prisma.subjectChunk.findMany({ where: { slug: { in: keep.map((h) => h.slug) } }, select: { slug: true, content: true } })).map((r) => [r.slug, r.content]));
  const list: RagHit[] = keep.map((h) => ({ ...h, content: text.get(h.slug) ?? "" }));
  return { a, idx, mode, dense, list, w };
}

/** Mã có cùng độ dài và khác đúng một ký tự (CSI196 -> CSI106) */
const oneOff = (a: string, b: string) => a.length === b.length && [...a].filter((c, i) => c !== b[i]).length === 1;

export const syllabusRagService = {
  invalidate() {
    index = null;
    loading = null;
  },

  async retrieve(question: string, qvec: number[] | null): Promise<RagResult> {
    const { a, idx, mode, dense, list, w } = await candidates(question, qvec);
    if (mode === "none") return { mode, subjects: [], unknownCodes: [], suggestions: [], hits: [], confident: false, dense };
    const suggestions = [...new Set(a.unknownCodes.flatMap((c) => idx.codes.filter((k) => oneOff(c, k.replace(/[A-Z]{1,2}$/, (m) => (c.endsWith(m) ? m : "")) || k) || oneOff(c, k))))].slice(0, 3);
    // Đã nêu môn có thật: chủ đề của câu hỏi đã rõ, nên luôn đưa các đoạn tốt nhất của môn đó cho Claude (độ khớp từ thấp thường chỉ do cách hỏi, ví dụ viết tắt hoặc lời thường ngày). Claude được dặn nói thẳng nếu nguồn không có thông tin.
    const known = mode === "subject" && list.length > 0;
    const confident = known || (list[0]?.p ?? 0) >= w.answer;
    let hits: RagHit[];
    if (!confident) hits = [];
    else if (mode === "subject") {
      hits = [];
      let chars = 0;
      for (const h of list) {
        if ((h.p < w.include && hits.length >= RAG_MIN_CHUNKS) || hits.length >= RAG_MAX_CHUNKS || chars + h.content.length > RAG_MAX_CONTEXT_CHARS) continue;
        hits.push(h);
        chars += h.content.length;
      }
    } else {
      // Không nêu môn: mỗi môn lấy đoạn tốt nhất, liệt kê vài môn
      const seen = new Set<string>();
      hits = list.filter((h) => h.p >= w.include && !seen.has(h.subject) && (seen.add(h.subject), true)).slice(0, RAG_CROSS_SUBJECTS);
    }
    return { mode, subjects: a.subjects, unknownCodes: a.unknownCodes, suggestions, hits, confident, dense };
  },
};

const esc = (s: string) => s.replace(/"/g, "'");

/** Khối <syllabus> đưa vào prompt. Rỗng nếu câu hỏi không liên quan tới syllabus. */
export function formatRagContext(r: RagResult): string {
  if (r.mode === "none") return "";
  if (r.hits.length === 0) return `<syllabus status="no_match"${r.unknownCodes.length ? ` unknown_codes="${r.unknownCodes.join(",")}"` : ""}${r.suggestions.length ? ` did_you_mean="${r.suggestions.join(",")}"` : ""}>No syllabus data matched this question.${r.suggestions.length ? " The code the user typed does not exist; ask whether they meant one of did_you_mean." : ""}</syllabus>`;
  if (r.mode === "subject") {
    const body = r.hits.map((h, i) => `<source subject="${h.subject}" part="${esc(KIND_LABEL[h.kind])}" rank="${i + 1}">\n${h.content}\n</source>`).join("\n");
    return `<syllabus mode="subject" subjects="${r.subjects.join(",")}">\n${body}\n</syllabus>`;
  }
  const body = r.hits.map((h, i) => `<candidate subject="${h.subject}" part="${esc(KIND_LABEL[h.kind])}" rank="${i + 1}">\n${h.content.slice(0, RAG_SNIPPET_CHARS)}${h.content.length > RAG_SNIPPET_CHARS ? "…" : ""}\n</candidate>`).join("\n");
  return `<syllabus mode="search">\n${body}\n</syllabus>`;
}
