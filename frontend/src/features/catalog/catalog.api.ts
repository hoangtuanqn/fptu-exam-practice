import { http } from "@/shared/api/client";

export interface CatalogSubject {
  code: string;
  name: string | null;
  exams: number; // số đề có sẵn
}

export interface CatalogExam {
  threadId: string;
  title: string;
  questions: number;
  createdAt: string;
  owned: boolean; // đã có trong kho của người đang xem
}

export const catalogApi = {
  subjects: () => http.get<CatalogSubject[]>("/catalog/subjects"),
  exams: (subject: string) => http.get<CatalogExam[]>("/catalog/exams", { subject }),
};
