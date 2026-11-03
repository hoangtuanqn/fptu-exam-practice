import { useEffect, useRef } from "react";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import type { ExamAnswersPayload } from "@/features/exam-import/types";
import { EVENTS } from "@/shared/realtime/events";
import { isRealtimeConnected, onConnectionChange, subscribeRoom } from "@/shared/realtime/socket";

const FALLBACK_POLL_MS = 6000; // chỉ dùng khi mất kết nối realtime

/**
 * Nhận kết quả AI giải đáp án của một đề qua socket, ngay khi xong hoặc lỗi.
 * Khi `enabled` là false thì không theo dõi gì. Mất kết nối thì tạm hỏi định kỳ (và dừng khi nối lại).
 */
export function useExamAnswersLive(examId: number | null, enabled: boolean, onUpdate: (payload: ExamAnswersPayload) => void) {
  const handler = useRef(onUpdate);
  handler.current = onUpdate;

  useEffect(() => {
    if (!enabled || examId === null) return;
    let poll: ReturnType<typeof setInterval> | null = null;

    const receive = (p: ExamAnswersPayload) => p.examId === examId && handler.current(p);
    const startPolling = () => {
      if (poll) return;
      poll = setInterval(() => {
        if (document.hidden) return;
        void examImportApi.answers(examId).then((r) => receive({ examId, ...r })).catch(() => undefined);
      }, FALLBACK_POLL_MS);
    };
    const stopPolling = () => {
      if (poll) clearInterval(poll);
      poll = null;
    };

    const offRoom = subscribeRoom<ExamAnswersPayload>("exam", examId, EVENTS.examAnswers, receive);
    const offConn = onConnectionChange((connected) => (connected ? stopPolling() : startPolling()));
    if (!isRealtimeConnected()) startPolling();

    return () => {
      stopPolling();
      offRoom();
      offConn();
    };
  }, [examId, enabled]);
}
