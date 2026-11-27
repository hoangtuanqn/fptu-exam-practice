import { http } from "@/shared/api/client";

// Kết quả tìm nhanh trên header: môn học, đề thi, flashcard (mỗi nhóm tối đa vài mục)
export interface SearchResult {
  subjects: { code: string; name: string | null }[];
  exams: { examId: string; title: string; subjectCode: string | null; questions: number | null; kind: string }[];
  flashcards: { code: string; name: string | null; cardCount: number }[];
}

export const searchApi = {
  query: (q: string, signal?: AbortSignal) => http.get<SearchResult>("/search", { q }, signal),
};
