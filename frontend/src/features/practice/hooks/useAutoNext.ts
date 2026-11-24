import { useCallback, useEffect, useRef, useState } from "react";
import { isMultiple } from "@/features/practice/utils/question";
import type { Quiz } from "./useQuiz";

const KEY = "practice_auto_next";
const read = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

// "Tự sang câu sau khi chọn": chỉ ở chế độ Thi (luyện tập cần xem kết quả ngay) và câu chọn một đáp án.
// Mặc định tắt, bật trong menu "…" của câu hỏi và được nhớ cho lần sau.
export function useAutoNext(quiz: Quiz) {
  const [on, setOn] = useState(read);
  const toggle = useCallback(() => {
    setOn((o) => {
      try {
        localStorage.setItem(KEY, o ? "0" : "1");
      } catch {
        /* không lưu được thì thôi */
      }
      return !o;
    });
  }, []);

  const q = quiz.questions[quiz.current];
  const answer = q ? (quiz.answers[q.number] ?? []).join("") : "";
  const key = q ? `${q.number}:${answer}` : "";
  const prev = useRef(key);
  const available = quiz.mode === "exam";
  const applies = on && available && !quiz.submitted && !!q && !isMultiple(q) && quiz.current < quiz.slots - 1;

  useEffect(() => {
    const was = prev.current;
    prev.current = key;
    // Chỉ khi chính câu này vừa được chọn/đổi đáp án (sang câu khác có sẵn đáp án thì không tự đi tiếp)
    if (!applies || !answer || was === key || !was.startsWith(`${q!.number}:`)) return;
    const t = window.setTimeout(quiz.next, 250); // chờ một nhịp để người dùng thấy đáp án vừa chọn
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { on, toggle, available };
}
