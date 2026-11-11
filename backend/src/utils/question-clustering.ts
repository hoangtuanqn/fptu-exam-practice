import { SIMILARITY_EPSILON } from "../constants/similarity";
import { assertSameDimensions, dotF32 } from "./vector";

// Gom các câu gần giống nhau thành nhóm. Hàm thuần (dữ liệu vào, nhóm ra), không đụng DB, để test được và luôn cho cùng kết quả.

export interface ClusterRow {
  questionId: number;
  examId: number;
  chapter: string | null; // ExamQuestion.topic
  vector: Float32Array; // đã chuẩn hoá độ dài 1 (cosine = tích vô hướng)
}

export interface ClusterOptions {
  threshold: number; // cosine >= ngưỡng thì coi là cùng một câu
  sameChapterOnly: boolean; // chỉ so câu cùng chương; câu chưa gắn chương chỉ so với nhau
  allowSameExam: boolean; // cho phép một nhóm chứa hai câu của cùng một đề
  borderlineMargin?: number; // > 0 thì trả thêm các cặp có |cosine - ngưỡng| <= margin
}

export interface ScoredPair {
  a: number; // questionId nhỏ hơn
  b: number;
  score: number;
}

export interface ClusterResult {
  groups: number[][]; // mỗi nhóm >= 2 câu, questionId tăng dần; các nhóm xếp theo câu đầu tiên
  borderline: ScoredPair[]; // điểm gần ngưỡng nhất trước
  compared: number; // số cặp đã so
}

/** Ngưỡng cosine phải trong (0, 1]; sai thì báo lỗi trước khi đọc/ghi gì. */
export function assertThreshold(threshold: number) {
  if (!Number.isFinite(threshold) || threshold <= 0 || threshold > 1) throw new Error(`Threshold must be in (0, 1], got ${threshold}`);
  return threshold;
}

/** Chia các câu thành từng phần chỉ so với nhau; mỗi phần xếp theo questionId để thứ tự luôn cố định. */
export function partitionRows(rows: readonly ClusterRow[], sameChapterOnly: boolean): ClusterRow[][] {
  const sorted = [...rows].sort((x, y) => x.questionId - y.questionId);
  if (!sameChapterOnly) return sorted.length ? [sorted] : [];
  const parts = new Map<string, ClusterRow[]>();
  for (const r of sorted) {
    const key = r.chapter === null ? "\u0000null" : `c:${r.chapter}`;
    (parts.get(key) ?? parts.set(key, []).get(key)!).push(r);
  }
  return [...parts.entries()].sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0)).map(([, part]) => part);
}

interface Edge {
  i: number;
  j: number;
  score: number;
}

/** Union-find giữ thêm tập đề của mỗi nhóm để chặn việc gộp hai câu cùng đề. */
class ExamAwareUnionFind {
  private parent: number[];
  private exams: Set<number>[];

  constructor(examIds: readonly number[]) {
    this.parent = examIds.map((_, i) => i);
    this.exams = examIds.map((e) => new Set([e]));
  }

  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]!]!;
      x = this.parent[x]!;
    }
    return x;
  }

  /** Gộp hai nhóm; trả false nếu đã chung nhóm hoặc (khi không cho phép) hai nhóm có chung một đề. */
  union(a: number, b: number, allowSameExam: boolean) {
    let ra = this.find(a);
    let rb = this.find(b);
    if (ra === rb) return false;
    const ea = this.exams[ra]!;
    const eb = this.exams[rb]!;
    if (!allowSameExam) for (const e of eb) if (ea.has(e)) return false;
    if (ea.size < eb.size) [ra, rb] = [rb, ra]; // gắn nhóm nhỏ vào nhóm lớn (kết quả chỉ là tập thành viên nên gốc nào cũng được)
    this.parent[rb] = ra;
    for (const e of this.exams[rb]!) this.exams[ra]!.add(e);
    return true;
  }
}

/** Mọi cặp trong một phần có cosine >= ngưỡng - margin (margin = 0 thì chỉ các cặp đạt ngưỡng). */
function scorePairs(part: readonly ClusterRow[], minScore: number, allowSameExam: boolean) {
  const edges: Edge[] = [];
  let compared = 0;
  for (let i = 0; i < part.length; i++) {
    const a = part[i]!;
    for (let j = i + 1; j < part.length; j++) {
      const b = part[j]!;
      if (!allowSameExam && a.examId === b.examId) continue;
      assertSameDimensions(a.vector, b.vector);
      compared++;
      const score = dotF32(a.vector, b.vector);
      if (score >= minScore - SIMILARITY_EPSILON) edges.push({ i, j, score });
    }
  }
  return { edges, compared };
}

/**
 * Gom nhóm trong một phần: duyệt các cặp đạt ngưỡng từ giống nhất đến kém nhất (bằng điểm thì theo vị trí),
 * gộp hai nhóm trừ khi việc gộp đưa hai câu của cùng một đề vào chung nhóm (khi allowSameExam = false).
 * Chuỗi a~b~c mà a, c cùng đề: cặp mạnh hơn được gộp trước, cặp còn lại bị bỏ, nên câu yếu hơn ở ngoài nhóm đó.
 */
function clusterPart(part: readonly ClusterRow[], edges: readonly Edge[], threshold: number, allowSameExam: boolean) {
  const uf = new ExamAwareUnionFind(part.map((r) => r.examId));
  const strong = edges.filter((e) => e.score >= threshold - SIMILARITY_EPSILON).sort((x, y) => y.score - x.score || x.i - y.i || x.j - y.j);
  for (const e of strong) uf.union(e.i, e.j, allowSameExam);

  const byRoot = new Map<number, number[]>();
  part.forEach((r, i) => {
    const root = uf.find(i);
    (byRoot.get(root) ?? byRoot.set(root, []).get(root)!).push(r.questionId);
  });
  return [...byRoot.values()].filter((g) => g.length >= 2);
}

export function clusterQuestions(rows: readonly ClusterRow[], opts: ClusterOptions): ClusterResult {
  const margin = Math.max(0, opts.borderlineMargin ?? 0);
  const groups: number[][] = [];
  const borderline: ScoredPair[] = [];
  let compared = 0;

  for (const part of partitionRows(rows, opts.sameChapterOnly)) {
    const scored = scorePairs(part, opts.threshold - margin, opts.allowSameExam);
    compared += scored.compared;
    groups.push(...clusterPart(part, scored.edges, opts.threshold, opts.allowSameExam));
    if (margin > 0) {
      for (const e of scored.edges) {
        if (Math.abs(e.score - opts.threshold) <= margin + SIMILARITY_EPSILON) borderline.push({ a: part[e.i]!.questionId, b: part[e.j]!.questionId, score: e.score });
      }
    }
  }

  for (const g of groups) g.sort((x, y) => x - y);
  groups.sort((x, y) => x[0]! - y[0]!);
  borderline.sort((x, y) => Math.abs(x.score - opts.threshold) - Math.abs(y.score - opts.threshold) || x.a - y.a || x.b - y.b);
  return { groups, borderline, compared };
}
