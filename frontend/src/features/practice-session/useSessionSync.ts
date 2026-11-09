import { useCallback, useEffect, useRef } from "react";
import type { Quiz } from "@/features/practice/hooks/useQuiz";
import { sessionApi, type SessionState } from "./session.api";

const SAVE_DELAY_MS = 1200; // sau lần chọn đáp án cuối thì lưu
const HEARTBEAT_MS = 20_000; // cứ chừng này lại lưu một lần để thời gian làm bài không bị hụt nhiều

// Giữ lượt làm bài trên server khớp với những gì người dùng đang làm:
// tạo lượt mới mỗi lần bắt đầu/làm lại đề của hệ thống, tự lưu đáp án + vị trí + thời gian, và lưu nốt khi đóng/tải lại trang.
// Nhờ vậy tải lại trang vẫn làm tiếp được đúng chỗ cũ.
export function useSessionSync(quiz: Quiz) {
  const { sessionId, setSessionId, examId, answersPending, mode, submitted, session } = quiz;
  const hasQuiz = quiz.questions.length > 0;

  // Luôn giữ bản mới nhất để các hàm lưu chạy lúc đóng trang không đọc phải giá trị cũ
  const latest = useRef({
    sessionId,
    submitted,
    state: null as SessionState | null,
  });
  latest.current = {
    sessionId,
    submitted,
    state: {
      answers: quiz.answers,
      checked: quiz.checked,
      flagged: quiz.flagged,
      current: quiz.current,
      elapsedSec: quiz.elapsed,
    } as unknown as SessionState,
  };

  // Dấu của lần lưu thành công gần nhất (không tính thời gian): lần lưu theo thay đổi mà nội dung y hệt thì bỏ qua, đỡ gửi thừa
  const savedSig = useRef<string | null>(null);
  const sigOf = (st: SessionState) => JSON.stringify([st.answers, st.checked, st.flagged, st.current]);

  const flush = useCallback((submit = false, keepalive = false, onlyIfChanged = false) => {
    const { sessionId: id, state } = latest.current;
    if (id === null || !state) return Promise.resolve();
    const sig = `${id}:${sigOf(state)}`;
    if (onlyIfChanged && savedSig.current === sig) return Promise.resolve();
    return sessionApi.save(id, state, submit, keepalive).then(
      () => void (savedSig.current = sig),
      () => undefined, // mất mạng thoáng qua: lần lưu sau sẽ bù
    );
  }, []);

  // Tạo lượt mới. Làm lại cùng đề khi lượt cũ chưa nộp thì bỏ lượt cũ đi, tránh kho đầy lượt dở dang.
  const last = useRef<{
    id: number;
    examId: number;
    submitted: boolean;
  } | null>(null);
  const creating = useRef<string | null>(null);
  useEffect(() => {
    if (!hasQuiz || examId === null || answersPending || sessionId !== null) return;
    const key = `${session}:${examId}`;
    if (creating.current === key) return; // đang tạo (kể cả khi effect chạy lặp)
    creating.current = key;

    const old = last.current;
    last.current = null;
    if (old && old.examId === examId && !old.submitted) void sessionApi.remove(old.id).catch(() => undefined);

    sessionApi
      .create(examId, mode === "exam" ? "EXAM" : "PRACTICE")
      .then((s) => {
        if (creating.current !== key) return; // đã đổi đề/làm lại trong lúc chờ
        last.current = { id: s.id, examId, submitted: false };
        setSessionId(s.id);
      })
      .catch(() => {
        if (creating.current === key) creating.current = null; // thử lại ở lần render sau
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasQuiz, examId, answersPending, sessionId, session]);

  // Lượt được mở lại từ danh sách làm dở: ghi nhớ để "Làm lại" còn biết bỏ lượt này
  useEffect(() => {
    if (sessionId !== null && examId !== null && last.current?.id !== sessionId) last.current = { id: sessionId, examId, submitted: false };
  }, [sessionId, examId]);

  // Lưu sau mỗi thay đổi (gộp các lần bấm liên tiếp)
  useEffect(() => {
    if (sessionId === null || submitted) return;
    const t = setTimeout(() => void flush(false, false, true), SAVE_DELAY_MS);
    return () => clearTimeout(t);
  }, [sessionId, submitted, quiz.answers, quiz.checked, quiz.flagged, quiz.current, flush]);

  useEffect(() => {
    if (sessionId === null || submitted) return;
    // Tab đang ẩn thì không cần nhịp lưu: lúc ẩn đã lưu nốt (visibilitychange bên dưới)
    const t = setInterval(() => document.visibilityState === "visible" && void flush(), HEARTBEAT_MS);
    return () => clearInterval(t);
  }, [sessionId, submitted, flush]);

  // Nộp bài: chốt lượt này lại
  useEffect(() => {
    if (!submitted || sessionId === null) return;
    if (last.current?.id === sessionId) last.current.submitted = true;
    void flush(true);
  }, [submitted, sessionId, flush]);

  // Đóng/tải lại trang hoặc chuyển tab trên điện thoại: lưu nốt bằng request keepalive
  useEffect(() => {
    const save = () => {
      if (!latest.current.submitted) void flush(false, true);
    };
    const onVisibility = () => document.visibilityState === "hidden" && save();
    window.addEventListener("pagehide", save);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", save);
      document.removeEventListener("visibilitychange", onVisibility);
      save();
    };
  }, [flush]);

  return { flush };
}
