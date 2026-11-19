import { useEffect } from "react";
import { prefetchImage } from "@/shared/api/protectedImage";
import type { Quiz } from "./useQuiz";

// Tải trước ảnh câu kế tiếp và câu trước đó vào cache của trình duyệt, để bấm Tiếp/Enter là hiện ngay không phải chờ.
// Ảnh nằm trong bộ nhớ của trang (xem protectedImage.ts) nên khi sang câu đó là hiện ngay.
export function usePreloadImages(quiz: Pick<Quiz, "questions" | "current">) {
  const { questions, current } = quiz;
  useEffect(() => {
    const targets = [questions[current + 1], questions[current - 1], questions[current + 2]];
    for (const q of targets) {
      if (!q) continue;
      prefetchImage(q.imageUrl);
    }
  }, [questions, current]);
}
