import type { AnswerSource } from "../repositories/exam.repository";

// Người dùng chỉ thấy lời nhắn chung; lý do kỹ thuật nằm ở báo cáo và log để admin xem
export const failedMessage = (source: string) =>
  source === "FAILED" || source === "DEFAULT" ? "AI chưa phân tích được đáp án của đề này. Đề chỉ xem được cho tới khi có đáp án." : null;

// Trạng thái + đáp án của đề, dùng chung cho API hỏi đáp án và sự kiện realtime
export const toAnswersPayload = (exam: { answerSource: string; questions: { number: number; answer: string }[] }) => ({
  status: exam.answerSource as AnswerSource,
  answerError: failedMessage(exam.answerSource),
  answers: exam.questions.map((q) => ({ number: q.number, correct: q.answer.split(/\s+/).filter(Boolean) })),
});
