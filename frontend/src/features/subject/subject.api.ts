import { http } from "@/shared/api/client";

export interface SubjectItem {
  code: string;
  name: string;
}

export interface SubjectInfo {
  id?: number; // id số của môn; máy chủ cũ chưa trả trường này
  code: string;
  name: string;
  chapters: { number: number; title: string }[];
  exams: number;
}

export const subjectApi = {
  subjects: () => http.get<SubjectItem[]>("/subjects"),
  // Bộ đề theo chương: môn thiếu tên chương thì ok=false (máy chủ đồng thời gửi báo cáo cho admin)
  chapterSetCheck: (code: string) => http.post<{ ok: boolean; message: string | null }>(`/subjects/${encodeURIComponent(code)}/chapter-set-check`),
  info: (code: string) => http.get<SubjectInfo>(`/subjects/${encodeURIComponent(code)}`),
};
