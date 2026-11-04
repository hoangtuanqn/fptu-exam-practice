import { useEffect, useRef } from "react";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import type { ExamQuestionsPayload } from "@/features/exam-import/types";
import { EVENTS } from "@/shared/realtime/events";
import { isRealtimeConnected, onConnectionChange, subscribeRoom } from "@/shared/realtime/socket";

const FALLBACK_POLL_MS = 3000; // chỉ dùng khi mất kết nối realtime

/**
 * Đề đang được lấy về: nhận các câu mới ngay khi tải xong qua socket (và tin lấy đề thất bại).
 * Khi `enabled` là false thì không theo dõi gì. Mất kết nối thì tạm hỏi định kỳ cả đề (và dừng khi nối lại).
 */
export function useExamQuestionsLive(
  examId: number | null,
  enabled: boolean,
  onQuestions: (payload: ExamQuestionsPayload) => void,
  onFailed: (message: string) => void,
) {
  const questionsRef = useRef(onQuestions);
  const failedRef = useRef(onFailed);
  questionsRef.current = onQuestions;
  failedRef.current = onFailed;

  useEffect(() => {
    if (!enabled || examId === null) return;
    let poll: ReturnType<typeof setInterval> | null = null;

    const receive = (p: ExamQuestionsPayload) => p.examId === examId && questionsRef.current(p);
    const failed = (p: { examId: number; message: string }) => p.examId === examId && failedRef.current(p.message);

    const startPolling = () => {
      if (poll) return;
      poll = setInterval(() => {
        if (document.hidden) return;
        void examImportApi
          .exam(examId)
          .then((e) => receive({ examId, total: e.totalQuestions, questions: e.questions.map((q) => ({ number: q.number, imageUrl: q.imageUrl, correct: q.correct })) }))
          .catch(() => failedRef.current("Đề này không còn nữa, có thể việc lấy đề đã thất bại"));
      }, FALLBACK_POLL_MS);
    };
    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };

    const offQuestions = subscribeRoom<ExamQuestionsPayload>("exam", examId, EVENTS.examQuestions, receive);
    const offFailed = subscribeRoom<{ examId: number; message: string }>("exam", examId, EVENTS.examFailed, failed);
    const offConn = onConnectionChange((connected) => (connected ? stopPolling() : startPolling()));
    if (!isRealtimeConnected()) startPolling();

    return () => {
      stopPolling();
      offQuestions();
      offFailed();
      offConn();
    };
  }, [examId, enabled]);
}
