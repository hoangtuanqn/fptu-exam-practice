import { http } from "@/shared/api/client";

export type GradeStatus = "studying" | "passed" | "failed" | "unknown";
export type AdviceState = "passed" | "failed" | "need" | "resit" | "impossible" | "waiting";

export interface ExamPart {
  group: string;
  weight: number;
  score: number | null;
  resit: boolean;
  minScore: number | null;
}

export interface MockStats {
  n: number;
  average: number;
  spread: number;
}

export interface BreakdownRow {
  group: string;
  name: string;
  weight: number;
  score: number | null;
  value: number; // điểm được dùng để tính (điểm thật hoặc dự đoán)
  predicted: boolean;
}

export interface FinalPrediction {
  base: number;
  mock: MockStats | null;
  mockWeight: number;
  floor: number;
  value: number;
}

export interface GradeAdvice {
  minPass: number;
  earned: number;
  gradedWeight: number;
  final: ExamPart | null;
  practical: ExamPart | null;
  neededFinal: number | null;
  assumedOthers: number | null;
  pendingWeight: number;
  projected: number | null;
  projectedPass: boolean;
  projectedLow: number | null;
  projectedHigh: number | null;
  finalPrediction: FinalPrediction | null;
  breakdown: BreakdownRow[];
  state: AdviceState;
}

export interface GradeCourse {
  courseId: string;
  subjectCode: string;
  subjectName: string;
  termName: string;
  classCode: string;
  status: GradeStatus;
  average: number | null;
  syllabusKnown: boolean;
  advice: GradeAdvice;
  projected: number | null; // điểm dự đoán của môn đang học
  projectedPass: boolean;
  credits: number;
  creditsKnown: boolean;
  attempt: number; // lần học thứ mấy của môn
  kind: "first" | "retake" | "improve";
  counted: boolean; // có tính vào GPA không
  note: "excluded" | "superseded" | null;
}

export interface GradeTerm {
  termName: string;
  gpa: number | null;
  credits: number;
  tier: string | null;
  studyingCredits: number;
  failedCount: number;
  registeredCredits: number;
  courses: GradeCourse[];
}

export interface GradeTier {
  key: string;
  label: string;
  min: number;
  reached: boolean;
  meets: boolean; // đạt theo điểm dự kiến
  gap: number | null; // còn thiếu bao nhiêu điểm TB kỳ (theo dự kiến)
  blocked: string | null; // lý do kỳ này không được xét danh hiệu (trượt môn, thiếu tín chỉ)
  needAverage: number | null; // trung bình cần ở các môn đang học để chạm mức này; > 10 = không thể trong kỳ này
}

/** Một buổi thi trong Lịch thi trên FAP. kind: FE (cuối kỳ), PE (thực hành), 2NDFE (lượt thi lần 2) */
export interface ExamSlot {
  date: string; // YYYY-MM-DD
  start: string;
  end: string;
  room: string;
  subjectCode: string;
  subjectName: string;
  format: string;
  kind: string;
  resultDate: string | null;
  note: string;
}

export interface GradeOverview {
  enabled: boolean;
  syncedAt: string | null;
  courses: GradeCourse[];
  terms: GradeTerm[];
  cumulative: { gpa: number | null; credits: number; tier: string | null; studyingCredits: number };
  currentTerm: { termName: string; gpa: number | null; credits: number; studyingCredits: number; projectedGpa: number | null; projectedLow: number | null; projectedHigh: number | null; predictedCredits: number; unpredictedCredits: number } | null;
  tiers: GradeTier[];
  exams: ExamSlot[];
}

/** Dữ liệu do tiện ích Chrome đọc từ FAP (xem chrome-extension/fap.js) */
export interface ExtensionGrades {
  at: number;
  courses: unknown[];
  exams?: unknown[];
}

export const gradeApi = {
  overview: () => http.get<GradeOverview>("/grades/me"),
  setting: () => http.get<{ enabled: boolean; syncedAt: string | null }>("/grades/setting"),
  setEnabled: (enabled: boolean) => http.put<{ enabled: boolean; syncedAt: string | null }>("/grades/setting", { enabled }),
  sync: (courses: unknown[], exams?: unknown[]) => http.post<{ synced: number; exams: number }>("/grades/sync", { courses, ...(exams && { exams }) }),
  clear: () => http.delete("/grades/me"),
};
