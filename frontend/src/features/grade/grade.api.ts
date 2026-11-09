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

export interface GradeOverview {
  enabled: boolean;
  syncedAt: string | null;
  courses: GradeCourse[];
  terms: GradeTerm[];
  cumulative: { gpa: number | null; credits: number; tier: string | null; studyingCredits: number };
  currentTerm: { termName: string; gpa: number | null; credits: number; studyingCredits: number; projectedGpa: number | null; predictedCredits: number; unpredictedCredits: number } | null;
  tiers: GradeTier[];
}

/** Dữ liệu do tiện ích Chrome đọc từ FAP (xem chrome-extension/fap.js) */
export interface ExtensionGrades {
  at: number;
  courses: unknown[];
}

export const gradeApi = {
  overview: () => http.get<GradeOverview>("/grades/me"),
  setEnabled: (enabled: boolean) => http.put<{ enabled: boolean; syncedAt: string | null }>("/grades/setting", { enabled }),
  sync: (courses: unknown[]) => http.post<{ synced: number }>("/grades/sync", { courses }),
  clear: () => http.delete("/grades/me"),
};
