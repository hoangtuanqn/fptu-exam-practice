import { OPTIONS } from "@/features/practice/config/options";
import { useKeydown } from "./useKeydown";
import type { Quiz } from "./useQuiz";

// Phím tắt khi làm bài: ← → chuyển câu, A–H chọn đáp án, M đánh dấu.
// Enter: luyện tập có đáp án chưa chốt thì chốt trước; còn lại là sang câu tiếp, và ở câu cuối là Nộp bài.
export function useQuizShortcuts(quiz: Quiz, enabled: boolean, onSubmit?: () => void) {
  const question = quiz.questions[quiz.current];

  useKeydown((e) => {
    if (!question) return;

    if (e.key === "ArrowRight") quiz.next();
    else if (e.key === "ArrowLeft") quiz.prev();
    else if (e.key === "Enter") {
      e.preventDefault(); // tránh kích hoạt nút đang được focus (sẽ thành bấm hai lần)
      if (quiz.canCheck(question)) quiz.check(question);
      else if (quiz.current < quiz.questions.length - 1) quiz.next();
      else onSubmit?.(); // câu cuối: giống bấm nút Nộp bài
    } else if (e.key.toLowerCase() === "m") {
      quiz.toggleFlag(question.number); // M = đánh dấu xem lại
    } else {
      const letter = e.key.toUpperCase();
      if (OPTIONS.includes(letter)) quiz.choose(question, letter);
    }
  }, enabled && !!question);
}
