import { http } from "@/shared/api/client";

export interface FlashcardItem {
  number: number; // số câu trong bộ
  imageUrl: string; // ảnh câu hỏi (link ký, sống ngắn hạn)
  answer: string[]; // ví dụ ["B"] hoặc ["A","C"]
}

export interface FlashcardResult {
  subject: string;
  total: number; // tổng số thẻ của môn (số thật, kể cả phần bị khóa)
  locked: boolean; // gói thường: chỉ có các thẻ xem trước
  hidden: number; // số thẻ bị khóa
  items: FlashcardItem[];
}

export interface FlashcardSubject {
  code: string;
  name: string;
  cardCount: number;
}

export const flashcardApi = {
  subjects: () => http.get<{ items: FlashcardSubject[] }>("/flashcards/subjects"),
  subject: (code: string) => http.get<FlashcardResult>(`/flashcards/subjects/${encodeURIComponent(code)}`),
};
