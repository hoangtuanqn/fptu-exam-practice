import { http } from "@/shared/api/client";

export interface SubjectItem {
  code: string;
  name: string;
}

export const chapterSetApi = {
  subjects: () => http.get<SubjectItem[]>("/subjects"),
};
