import { useEffect } from "react";
import type { Quiz } from "./useQuiz";

// Tải trước ảnh câu kế tiếp và câu trước đó vào cache của trình duyệt, để bấm Tiếp/Enter là hiện ngay không phải chờ.
// Ảnh được server cache 7 ngày nên chỉ tải thật ở lần đầu.
export function usePreloadImages(quiz: Pick<Quiz, "questions" | "current">) {
  const { questions, current } = quiz;
  useEffect(() => {
    const targets = [questions[current + 1], questions[current - 1], questions[current + 2]];
    for (const q of targets) {
      if (!q) continue;
      const img = new Image();
      img.decoding = "async";
      img.src = q.imageUrl; // không cần giữ tham chiếu: trình duyệt vẫn ghi ảnh vào cache khi tải xong
    }
  }, [questions, current]);
}
