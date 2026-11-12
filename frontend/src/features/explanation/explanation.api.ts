import { http } from "@/shared/api/client";
import type { FreeTurnStatus } from "@/features/link-reward/link-reward.api";

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
  freeTurns?: FreeTurnStatus; // lượt giải thích miễn phí nhận từ vượt link (máy chủ cũ không trả trường này)
}

export interface ExplanationResult {
  content: string;
  cached: boolean; // lời giải đã lưu sẵn (không phải AI vừa tạo)
  charged: number; // credit vừa bị trừ (0 nếu đã mua trước đó)
  balanceAfter: number;
  freeTurnUsed?: boolean; // đã dùng 1 lượt miễn phí cho câu này
}

export interface UnlockResult {
  charged: number;
  questions: number;
  balanceAfter: number;
}

// Lượt hỏi AI về một câu trong ngày. Pro: unlimited = true, limit/remaining = null
export interface ChatQuota {
  limit: number | null;
  used: number;
  remaining: number | null;
  resetsAt: string; // 0h hôm sau (giờ Việt Nam)
  unlimited: boolean;
}

export interface ExplainChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const CHAT_QUOTA_EXCEEDED = "CHAT_QUOTA_EXCEEDED";

export const explanationApi = {
  chatQuota: async () => (await http.get<{ quota: ChatQuota }>("/explanations/chat/quota")).quota,
  chat: (examId: number, questionNumber: number, messages: ExplainChatMessage[]) => http.post<{ reply: string; quota?: ChatQuota }>("/explanations/chat", { examId, questionNumber, messages }),
  info: (examId: number) => http.get<ExplanationInfo>(`/explanations/exams/${examId}`),
  explain: (examId: number, questionNumber: number, useFreeTurn = false) => http.post<ExplanationResult>("/explanations", { examId, questionNumber, ...(useFreeTurn && { useFreeTurn: true }) }),
  unlock: (examId: number, price: number) => http.post<UnlockResult>("/explanations/unlock", { examId, price }),
};
