import { http } from "@/shared/api/client";

export interface SubjectItem {
  code: string;
  name: string;
}

export interface SubjectInfo {
  code: string;
  name: string;
  chapters: { number: number; title: string }[];
  exams: number;
}

export const chapterSetApi = {
  info: (code: string) => http.get<SubjectInfo>(`/subjects/${encodeURIComponent(code)}`),
  subjects: () => http.get<SubjectItem[]>("/subjects"),
};
