import { http } from "@/shared/api/client";

export interface ExplanationInfo {
  price: number; // phí hiện tại (credit) mỗi lần xem lời giải thích một câu
  purchased: number[]; // các câu trong đề mà người dùng đã mua (xem lại miễn phí)
}

export interface ExplanationResult {
  content: string;
  cached: boolean; // lời giải đã lưu sẵn (không phải AI vừa tạo)
  charged: number; // credit vừa bị trừ (0 nếu đã mua trước đó)
  balanceAfter: number;
}

export const explanationApi = {
  info: (examId: number) => http.get<ExplanationInfo>(`/explanations/exams/${examId}`),
  explain: (examId: number, questionNumber: number) => http.post<ExplanationResult>("/explanations", { examId, questionNumber }),
};
