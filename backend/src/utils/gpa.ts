// Điểm trung bình (GPA) thang 10 của sinh viên FPTU, tính từ bảng điểm FAP. Hàm thuần, không đụng DB.
// Điểm TB kỳ: môn đã qua tính theo điểm, môn trượt tính 0 (tín chỉ vẫn ở mẫu số). GPA tích lũy: chỉ các môn đã Đạt. Trọng số là số tín chỉ, làm tròn 2 chữ số; học cải thiện thì kết quả lần trước bị hủy.
// Chỉ có hai bậc xếp loại sinh viên: Xuất sắc (GPA >= 9) và Giỏi (GPA >= 8); dưới 8 không xếp bậc.

export const DEFAULT_CREDITS = 0; // môn chưa có syllabus coi như 0 tín chỉ, tức chưa tính vào điểm
// Các môn không tính vào GPA, nhận ra theo tiền tố mã môn: tiếng Anh chuẩn bị (TRS1-6, LUK1-6), tiếng Nhật dự bị (JPD),
// Vovinam (VOV), thể chất (PES), quốc phòng (GDQP, QPD), thực tập doanh nghiệp (OJT), định hướng (DOM, ORG).
// Môn 0 tín chỉ cũng không tính (xem buildGpaReport).
export const NON_GPA_PREFIXES = ["TRS", "LUK", "JPD", "VOV", "PES", "GDQP", "QPD", "OJT", "DOM", "ORG"];

// Danh hiệu học kỳ cần đủ: đúng mức điểm TB kỳ, qua 100% môn trong kỳ, đủ số tín chỉ tối thiểu (thường từ 12) và không bị kỷ luật.
// Hệ thống không biết kỷ luật nên điều kiện này chỉ được nhắc trên giao diện.
export const MIN_TERM_CREDITS = 12;

export interface GpaTier {
  key: string;
  label: string;
  min: number;
}
export const GPA_TIERS: GpaTier[] = [
  { key: "excellent", label: "Xuất sắc", min: 9 },
  { key: "good", label: "Giỏi", min: 8 },
];

export interface GpaInput {
  courseId: string;
  subjectCode: string;
  termName: string;
  status: string; // studying | passed | failed | unknown
  average: number | null;
  credits: number | null;
  /** Môn đang học: điểm dự đoán từ điểm thành phần đã có (null = chưa có điểm nào để dự đoán) */
  projected?: { score: number; pass: boolean; low?: number | null; high?: number | null } | null;
}

export type AttemptKind = "first" | "retake" | "improve";

export interface GpaCourse {
  courseId: string;
  attempt: number; // lần học thứ mấy của môn này (1, 2, ...)
  kind: AttemptKind; // retake = học lại môn đã trượt, improve = học cải thiện môn đã đạt
  credits: number;
  creditsKnown: boolean;
  counted: boolean; // có tính vào GPA hay không
  note: "excluded" | "superseded" | null; // excluded: môn không tính GPA; superseded: kết quả bị lần học sau thay thế
}

export interface GpaTerm {
  termName: string;
  gpa: number | null;
  credits: number; // tín chỉ đã đạt và tính GPA trong kỳ
  tier: string | null;
  studyingCredits: number;
  failedCount: number; // số môn trượt trong kỳ (không tính môn không vào điểm)
  registeredCredits: number; // tín chỉ của mọi môn tính điểm trong kỳ, kể cả đang học và trượt
  /** Điểm TB kỳ dự kiến = môn đã tổng kết + môn đang học theo điểm dự đoán (môn dự đoán không qua tính 0) */
  projectedGpa: number | null;
  /** Khoảng dự kiến của điểm TB kỳ (chỉ khi có môn dự đoán kèm khoảng) */
  projectedLow: number | null;
  projectedHigh: number | null;
  predictedCredits: number; // tín chỉ của các môn đang học đã dự đoán được
  unpredictedCredits: number; // tín chỉ của các môn đang học chưa có điểm nào nên chưa dự đoán
  projectedFailCount: number; // số môn trượt + số môn dự đoán không qua
  projectedTier: string | null;
}

export interface GpaReport {
  courses: Map<string, GpaCourse>;
  terms: GpaTerm[]; // mới nhất trước
  cumulative: { gpa: number | null; credits: number; tier: string | null; studyingCredits: number };
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** "Fall2026" -> số để so sánh (năm * 10 + mùa); không đọc được thì 0 */
export function termOrder(name: string): number {
  const m = name.match(/(Spring|Summer|Fall)\s*(\d{4})/i);
  if (!m) return 0;
  return Number(m[2]) * 10 + ({ spring: 1, summer: 2, fall: 3 }[m[1]!.toLowerCase() as "spring"] ?? 0);
}

export const tierOf = (gpa: number | null): string | null => (gpa === null ? null : (GPA_TIERS.find((t) => gpa >= t.min)?.key ?? null));
const excluded = (code: string) => NON_GPA_PREFIXES.some((p) => code.toUpperCase().startsWith(p));
const scored = (c: GpaInput) => c.status === "passed" && c.average !== null;

export function buildGpaReport(input: GpaInput[]): GpaReport {
  const bySubject = new Map<string, GpaInput[]>();
  for (const c of input) (bySubject.get(c.subjectCode) ?? bySubject.set(c.subjectCode, []).get(c.subjectCode)!).push(c);

  const courses = new Map<string, GpaCourse>();
  for (const list of bySubject.values()) {
    list.sort((a, b) => termOrder(a.termName) - termOrder(b.termName));
    // GPA tích lũy lấy điểm cao nhất trong các lần học đã đạt (học cải thiện chỉ cập nhật khi điểm mới cao hơn); điểm kỳ cũ giữ nguyên
    const lastPassed = list.filter(scored).reduce<GpaInput | undefined>((best, c) => (!best || (c.average as number) >= (best.average as number) ? c : best), undefined);
    list.forEach((c, i) => {
      const prev = list.slice(0, i);
      const kind: AttemptKind = prev.length === 0 ? "first" : prev.some(scored) ? "improve" : "retake";
      const isExcluded = excluded(c.subjectCode) || (c.credits ?? DEFAULT_CREDITS) === 0;
      const counted = !isExcluded && lastPassed === c;
      courses.set(c.courseId, {
        courseId: c.courseId,
        attempt: i + 1,
        kind,
        credits: c.credits ?? DEFAULT_CREDITS,
        creditsKnown: c.credits !== null,
        counted,
        note: isExcluded ? "excluded" : scored(c) && lastPassed !== c ? "superseded" : null,
      });
    });
  }

  const gpaOf = (items: GpaInput[]) => {
    let credits = 0;
    let sum = 0;
    for (const c of items) {
      const info = courses.get(c.courseId)!;
      if (!info.counted) continue;
      credits += info.credits;
      sum += info.credits * (c.average as number);
    }
    return { credits, gpa: credits > 0 ? round2(sum / credits) : null };
  };
  const studyingCredits = (items: GpaInput[]) => items.filter((c) => c.status === "studying" && courses.get(c.courseId)!.note !== "excluded").reduce((n, c) => n + courses.get(c.courseId)!.credits, 0);

  const termNames = [...new Set(input.map((c) => c.termName))].sort((a, b) => termOrder(b) - termOrder(a));
  const terms = termNames.map((termName) => {
    const items = input.filter((c) => c.termName === termName);
    // GPA kỳ: các môn đã đạt trong kỳ (kể cả môn sau này bị học cải thiện thay thế thì vẫn là kết quả của kỳ đó)
    // Điểm TB kỳ: môn trượt tính 0 điểm nhưng tín chỉ vẫn nằm ở mẫu số nên kéo điểm kỳ xuống
    const own = items.filter((c) => (scored(c) || c.status === "failed") && courses.get(c.courseId)!.note !== "excluded");
    const pts = (c: GpaInput) => (c.status === "failed" ? 0 : (c.average as number));
    const credits = own.reduce((n, c) => n + courses.get(c.courseId)!.credits, 0);
    const gpa = credits > 0 ? round2(own.reduce((n, c) => n + courses.get(c.courseId)!.credits * pts(c), 0) / credits) : null;
    const failedCount = items.filter((c) => c.status === "failed" && courses.get(c.courseId)!.note !== "excluded").length;
    const registeredCredits = items.filter((c) => courses.get(c.courseId)!.note !== "excluded").reduce((n, c) => n + courses.get(c.courseId)!.credits, 0);
    const studying = studyingCredits(items);
    // Chỉ có danh hiệu khi kỳ đã xong, không trượt môn nào và đủ tín chỉ tối thiểu
    const eligible = studying === 0 && failedCount === 0 && registeredCredits >= MIN_TERM_CREDITS;
    // Dự kiến: thêm các môn đang học theo điểm dự đoán
    const live = items.filter((c) => c.status === "studying" && courses.get(c.courseId)!.note !== "excluded");
    const predicted = live.filter((c) => c.projected);
    const unpredictedCredits = live.filter((c) => !c.projected).reduce((n, c) => n + courses.get(c.courseId)!.credits, 0);
    const predictedCredits = predicted.reduce((n, c) => n + courses.get(c.courseId)!.credits, 0);
    const projCredits = credits + predictedCredits;
    const projPoints = own.reduce((n, c) => n + courses.get(c.courseId)!.credits * pts(c), 0) + predicted.reduce((n, c) => n + courses.get(c.courseId)!.credits * (c.projected!.pass ? c.projected!.score : 0), 0);
    const projectedGpa = projCredits > 0 ? round2(projPoints / projCredits) : null;
    const rangeOf = (pick: "low" | "high") => {
      if (!predicted.some((c) => c.projected![pick] != null)) return null;
      const extra = predicted.reduce((n, c) => n + courses.get(c.courseId)!.credits * (c.projected!.pass ? (c.projected![pick] ?? c.projected!.score) : 0), 0);
      const base = own.reduce((n, c) => n + courses.get(c.courseId)!.credits * pts(c), 0);
      return projCredits > 0 ? round2((base + extra) / projCredits) : null;
    };
    const projectedLow = rangeOf("low");
    const projectedHigh = rangeOf("high");
    const projectedFailCount = failedCount + predicted.filter((c) => !c.projected!.pass).length;
    const projectedTier = projectedFailCount === 0 && registeredCredits >= MIN_TERM_CREDITS ? tierOf(projectedGpa) : null;
    return { termName, gpa, credits, tier: eligible ? tierOf(gpa) : null, studyingCredits: studying, failedCount, registeredCredits, projectedGpa, projectedLow, projectedHigh, predictedCredits, unpredictedCredits, projectedFailCount, projectedTier };
  });

  const all = gpaOf(input);
  return { courses, terms, cumulative: { gpa: all.gpa, credits: all.credits, tier: tierOf(all.gpa), studyingCredits: studyingCredits(input) } };
}

/**
 * Điểm trung bình cần đạt cho `nextCredits` tín chỉ sắp tới để GPA tích lũy chạm `target`.
 * null = không tính được; > 10 nghĩa là không thể chỉ bằng số tín chỉ này.
 */
export function requiredAverage(gpa: number | null, credits: number, nextCredits: number, target: number): number | null {
  if (nextCredits <= 0) return null;
  const base = gpa ?? 0;
  const need = (target * (credits + nextCredits) - base * credits) / nextCredits;
  return Math.round(Math.max(need, 0) * 100) / 100;
}
