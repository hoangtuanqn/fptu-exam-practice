import { OPTIONS } from "@/features/practice/config/options";
import { useKeydown } from "./useKeydown";
import type { Quiz } from "./useQuiz";

// Phím tắt khi làm bài: ← → chuyển câu, A–H chọn đáp án, Enter xác nhận (chế độ luyện tập)
export function useQuizShortcuts(quiz: Quiz, enabled: boolean) {
  const question = quiz.questions[quiz.current];

  useKeydown((e) => {
    if (!question) return;

    if (e.key === "ArrowRight") quiz.next();
    else if (e.key === "ArrowLeft") quiz.prev();
    else if (e.key === "Enter") {
      if (quiz.canCheck(question)) {
        e.preventDefault(); // tránh kích hoạt nút đang được focus
        quiz.check(question);
      }
    } else if (e.key.toLowerCase() === "m") {
      quiz.toggleFlag(question.number); // M = đánh dấu xem lại
    } else {
      const letter = e.key.toUpperCase();
      if (OPTIONS.includes(letter)) quiz.choose(question, letter);
    }
  }, enabled && !!question);
}
