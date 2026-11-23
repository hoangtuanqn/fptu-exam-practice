import { useEffect, useRef } from "react";
import { examApi } from "@/features/exam/exam.api";
import type { ExamQuestionsPayload } from "@/features/exam/types";
import { EVENTS } from "@/shared/realtime/events";
import { isRealtimeConnected, onConnectionChange, subscribeRoom } from "@/shared/realtime/socket";

const FALLBACK_POLL_MS = 3000; // chỉ dùng khi mất kết nối realtime

/**
 * Đề đang được lấy về: nhận các câu mới ngay khi tải xong qua socket.
 * Khi `enabled` là false thì không theo dõi gì. Mất kết nối thì tạm hỏi định kỳ cả đề (và dừng khi nối lại);
 * `onFailed` chạy khi hỏi định kỳ mà đề không còn.
 */
export function useExamQuestionsLive(
  examId: string | null,
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

    const startPolling = () => {
      if (poll) return;
      poll = setInterval(() => {
        if (document.hidden) return;
        void examApi
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
    const offConn = onConnectionChange((connected) => (connected ? stopPolling() : startPolling()));
    if (!isRealtimeConnected()) startPolling();

    return () => {
      stopPolling();
      offQuestions();
      offConn();
    };
  }, [examId, enabled]);
}
