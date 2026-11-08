import { http } from "@/shared/api/client";

// Gói "mở khóa cả đề": trả một lần, xem lời giải mọi câu miễn phí (rẻ hơn mua lẻ từng câu)
export interface ExplanationBundle {
  unlocked: boolean; // đã mở khóa cả đề
  questions: number; // tổng số câu của đề
  remaining: number; // số câu chưa mua lẻ (giá gói tính trên các câu này)
  original: number; // giá nếu mua lẻ hết những câu còn lại
  price: number; // giá gói
  discountPercent: number;
  buyers: number; // số người đã mở khóa cả đề này (0 = chưa đủ lớn để khoe)
  promoEndsAt: string | null; // hạn chót thật của ưu đãi (null = không có đếm ngược)
}

export interface ExplanationInfo {
  price: number; // phí hiện tại (credit) mỗi lần xem lời giải thích một câu
  purchased: number[]; // các câu trong đề mà người dùng đã mua lẻ (xem lại miễn phí)
  unlocked: boolean;
  bundle: ExplanationBundle;
  freeTrialsLeft: number; // số lượt xem thử miễn phí còn lại của tài khoản
}

export interface ExplanationResult {
  content: string;
  cached: boolean; // lời giải đã lưu sẵn (không phải AI vừa tạo)
  charged: number; // credit vừa bị trừ (0 nếu đã mua trước đó)
  balanceAfter: number;
}

export interface UnlockResult {
  charged: number;
  questions: number;
  balanceAfter: number;
}

export interface AskTurn {
  role: "user" | "assistant";
  content: string;
}
export interface AskQuota {
  limit: number; // số lượt hỏi AI mỗi ngày của gói hiện tại
  remaining: number;
  pro: boolean;
}
export interface AskResult {
  reply: string;
  remaining: number;
  limit: number;
}

export const explanationApi = {
  askQuota: () => http.get<AskQuota>("/explanations/ask/quota"),
  ask: (examId: number, questionNumber: number, sessionId: number, messages: AskTurn[]) => http.post<AskResult>("/explanations/ask", { examId, questionNumber, sessionId, messages }),
  info: (examId: number) => http.get<ExplanationInfo>(`/explanations/exams/${examId}`),
  explain: (examId: number, questionNumber: number) => http.post<ExplanationResult>("/explanations", { examId, questionNumber }),
  unlock: (examId: number, price: number) => http.post<UnlockResult>("/explanations/unlock", { examId, price }),
};
