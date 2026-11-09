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
}

export interface GradeOverview {
  enabled: boolean;
  syncedAt: string | null;
  courses: GradeCourse[];
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
