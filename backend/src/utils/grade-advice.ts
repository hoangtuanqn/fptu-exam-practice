// Tính điểm cần đạt để qua môn từ bảng điểm FAP. Hàm thuần (không đụng DB) để dễ kiểm tra.
// Quy ước FAP: nhóm điểm "X (Resit)" là lần thi lại của nhóm "X"; đã có điểm thi lại thì tính điểm thi lại, bỏ lần trước.

export interface GradeComponent {
  group: string; // nhóm điểm, ví dụ "Final Exam", "Labs"
  name: string; // tên cột điểm, ví dụ "Lab 3"
  weight: number; // trọng số (%) trên cả môn
  score: number | null; // thang 10; null = chưa có điểm
}

export interface SyllabusAssessment {
  category: string;
  weight: number | null;
  minScore: number | null; // điều kiện hoàn thành, ví dụ ">=4" thì 4
}

export const DEFAULT_MIN_PASS = 5;
export const DEFAULT_FINAL_MIN = 4; // điểm liệt của bài thi cuối kỳ (FE < 4 là không qua)
export const DEFAULT_PRACTICAL_MIN = 1; // điểm tối thiểu của bài thi thực hành (PE >= 1)

const RESIT = /\s*\(\s*resit\s*\)\s*$/i;
const FINAL = /^(final exam|final|fe|te|theory exam)\b/i;
const PRACTICAL = /practical|^pe\b/i;

// Tên phần điểm viết tắt/đầy đủ về cùng một dạng để so FAP với syllabus: "TE" = "Theoretical Exam (TE)", "FE" = "Final Exam"...
const ALIAS: Record<string, string> = { "theoretical exam": "te", "theory exam": "te", "final exam": "fe", "practical exam": "pe" };
const canonical = (name: string) => {
  const n = name.toLowerCase().replace(RESIT, "").trim();
  const short = n.match(/\(([a-z]{2,4})\)$/); // "theoretical exam (te)" -> "te"
  return short ? short[1]! : (ALIAS[n] ?? n);
};

const round1Up = (n: number) => Math.ceil(n * 10 - 1e-9) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;

export type AdviceState = "passed" | "failed" | "need" | "resit" | "impossible" | "waiting";

export interface ExamPart {
  group: string;
  weight: number;
  score: number | null;
  resit: boolean; // điểm đang tính là điểm thi lại
  minScore: number | null; // điểm tối thiểu của riêng phần này (theo syllabus)
}

export interface GradeAdvice {
  minPass: number;
  earned: number; // điểm đã tích lũy trên thang 10 của cả môn
  gradedWeight: number; // % trọng số đã có điểm
  final: ExamPart | null;
  practical: ExamPart | null;
  /** Điểm cần ở bài thi cuối kỳ (thang 10) để đạt minPass; null nếu không áp dụng */
  neededFinal: number | null;
  /** Điểm trung bình hiện tại nếu xét điểm các phần khác đã có (không tính phần chưa thi) */
  assumedOthers: number | null;
  /** % trọng số của các phần ngoài bài thi cuối kỳ chưa có điểm (được ước lượng bằng assumedOthers) */
  pendingWeight: number;
  /** Điểm môn dự đoán (thang 10) từ điểm đã có; phần chưa có điểm lấy mức trung bình hiện tại nhưng không dưới điểm tối thiểu. null nếu chưa có điểm nào */
  projected: number | null;
  /** Dự đoán có qua môn không (đủ điểm trung bình, FE >= 4, PE >= 1) */
  projectedPass: boolean;
  state: AdviceState;
}

function toPart(items: { group: string; weight: number; score: number | null }[], assessments: SyllabusAssessment[], resit: boolean): ExamPart | null {
  if (!items.length) return null;
  const weight = items.reduce((n, i) => n + i.weight, 0);
  const graded = items.filter((i) => i.score !== null);
  const score = graded.length === items.length && weight > 0 ? items.reduce((n, i) => n + i.weight * (i.score as number), 0) / weight : null;
  const base = items[0]!.group.replace(RESIT, "");
  const key = canonical(base);
  const a = assessments.find((x) => canonical(x.category) === key);
  return { group: base, weight, score: score === null ? null : round2(score), resit, minScore: a?.minScore ?? null };
}

export function adviseGrade(
  components: GradeComponent[],
  opts: { minPass?: number | null; assessments?: SyllabusAssessment[] | null; fapStatus?: string },
): GradeAdvice {
  const minPass = opts.minPass ?? DEFAULT_MIN_PASS;
  const assessments = opts.assessments ?? [];

  // Gom theo nhóm, ghép nhóm Resit với nhóm gốc
  const groups = new Map<string, { base: GradeComponent[]; resit: GradeComponent[] }>();
  for (const c of components) {
    const key = c.group.replace(RESIT, "").trim();
    const g = groups.get(key) ?? { base: [], resit: [] };
    (RESIT.test(c.group) ? g.resit : g.base).push(c);
    groups.set(key, g);
  }

  // Mỗi nhóm lấy lần tính điểm: đã có điểm thi lại thì lấy thi lại, không thì lấy lần đầu
  const effective: { group: string; weight: number; score: number | null; resit: boolean }[] = [];
  for (const [key, g] of groups) {
    const useResit = g.resit.some((i) => i.score !== null);
    const src = useResit ? g.resit : g.base.length ? g.base : g.resit;
    for (const i of src) effective.push({ group: key, weight: i.weight, score: i.score, resit: useResit });
  }

  const isFinal = (g: string) => FINAL.test(g) && !PRACTICAL.test(g);
  const finalItems = effective.filter((i) => isFinal(i.group));
  const practicalItems = effective.filter((i) => PRACTICAL.test(i.group));
  const final = toPart(finalItems.map((i) => ({ ...i })), assessments, finalItems.some((i) => i.resit));
  if (final && finalItems.some((i) => i.resit)) final.resit = true;
  // Điểm liệt: FE dưới 4 là không qua dù trung bình đủ; syllabus đòi cao hơn thì theo syllabus
  if (final) final.minScore = Math.max(final.minScore ?? 0, DEFAULT_FINAL_MIN);
  const practical = toPart(practicalItems.map((i) => ({ ...i })), assessments, practicalItems.some((i) => i.resit));
  // Thi thực hành (PE) cũng phải từ 1 trở lên
  if (practical) practical.minScore = Math.max(practical.minScore ?? 0, DEFAULT_PRACTICAL_MIN);

  const graded = effective.filter((i) => i.score !== null);
  const earned = graded.reduce((n, i) => n + (i.weight * (i.score as number)) / 100, 0);
  const gradedWeight = graded.reduce((n, i) => n + i.weight, 0);

  // Các phần ngoài bài thi cuối kỳ: dùng điểm trung bình đã có để ước lượng phần chưa có điểm
  const others = effective.filter((i) => !isFinal(i.group));
  const othersGraded = others.filter((i) => i.score !== null);
  const othersGradedW = othersGraded.reduce((n, i) => n + i.weight, 0);
  const assumedOthers = othersGradedW > 0 ? round2((othersGraded.reduce((n, i) => n + i.weight * (i.score as number), 0) / othersGradedW)) : null;
  const othersPendingW = others.filter((i) => i.score === null).reduce((n, i) => n + i.weight, 0);
  const assumed = assumedOthers ?? minPass;
  // Phần chưa có điểm lấy mức trung bình hiện tại, nhưng bài thực hành không thể dưới điểm tối thiểu
  const pendingValue = (i: { group: string }) => (PRACTICAL.test(i.group) ? Math.max(assumed, practical?.minScore ?? 0) : assumed);
  const othersProjected =
    othersGraded.reduce((n, i) => n + (i.weight * (i.score as number)) / 100, 0) + others.filter((i) => i.score === null).reduce((n, i) => n + (i.weight * pendingValue(i)) / 100, 0);

  const finalW = final?.weight ?? 0;
  let neededFinal: number | null = null;
  if (final && finalW > 0) {
    const raw = ((minPass - othersProjected) * 100) / finalW;
    neededFinal = round1Up(Math.max(raw, final.minScore ?? 0, 0));
  }

  const projected = othersProjected + (final?.score != null ? (finalW * final.score) / 100 : 0);
  const belowPractical = !!practical && practical.score !== null && practical.minScore !== null && practical.score < practical.minScore;

  // Dự đoán điểm môn: FE chưa thi thì lấy mức trung bình hiện tại nhưng không dưới điểm liệt
  const finalValue = final ? (final.score ?? Math.max(assumed, final.minScore ?? 0)) : null;
  const predicted = gradedWeight > 0 ? othersProjected + (final && finalValue !== null ? (finalW * finalValue) / 100 : 0) : null;
  const projectedPass = predicted !== null && predicted + 1e-9 >= minPass && (!final || finalValue === null || final.minScore === null || finalValue + 1e-9 >= final.minScore) && !belowPractical;
  const fapPassed = opts.fapStatus === "passed";
  const fapFailed = opts.fapStatus === "failed";

  let state: AdviceState;
  if (fapPassed) state = "passed";
  else if (final && final.score === null) state = neededFinal !== null && neededFinal > 10 ? "impossible" : "need";
  else if (final && final.score !== null) {
    const belowFinal = final.minScore !== null && final.score < final.minScore;
    if (!fapFailed && projected + 1e-9 >= minPass && !belowFinal && !belowPractical) state = "passed";
    else state = neededFinal !== null && neededFinal > 10 ? "impossible" : "resit";
  } else state = "waiting";

  return { minPass, earned: round2(earned), gradedWeight: round2(gradedWeight), final, practical, neededFinal, assumedOthers, pendingWeight: round2(othersPendingW), projected: predicted === null ? null : round2(predicted), projectedPass, state };
}

/** Điều kiện hoàn thành trong syllabus (">=4", "> 0", "4") -> điểm tối thiểu; không có thì null */
export function parseMinScore(criteria: string): number | null {
  const m = criteria.match(/(?:>=|≥|>)?\s*(\d+(?:[.,]\d+)?)/);
  if (!m) return null;
  const n = Number(m[1]!.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
