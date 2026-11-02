import type { Quiz } from "@/features/practice/hooks/useQuiz";
import { ConfirmSubmitDialog } from "./ConfirmSubmitDialog";
import { NotFoundDialog } from "./NotFoundDialog";
import { ResultDialog } from "./ResultDialog";
import { StartDialog } from "./StartDialog";

export type SubmitDialog = "confirm" | "result" | null;

interface Props {
  quiz: Quiz;
  dialog: SubmitDialog;
  onDialogChange: (dialog: SubmitDialog) => void;
  onCloseZoom: () => void;
}

// Quyết định hộp thoại nào đang hiện: bắt đầu / lỗi thư mục / xác nhận nộp / bảng điểm
export function QuizDialogs({ quiz, dialog, onDialogChange, onCloseZoom }: Props) {
  const { pending } = quiz;

  return (
    <>
      {pending && (
        <StartDialog
          title={pending.title}
          total={pending.questions.length}
          graded={pending.questions.filter((q) => q.correct.length > 0).length}
          replacing={quiz.questions.length > 0 && quiz.answeredCount > 0 && !quiz.submitted}
          onCancel={quiz.cancelPending}
          onStart={(mode) => {
            quiz.startExam(mode);
            onCloseZoom();
            onDialogChange(null);
          }}
        />
      )}

      {quiz.notFound && <NotFoundDialog onClose={quiz.dismissNotFound} />}

      {dialog === "confirm" && (
        <ConfirmSubmitDialog
          answered={quiz.answeredCount}
          total={quiz.questions.length}
          onCancel={() => onDialogChange(null)}
          onConfirm={() => {
            quiz.submit();
            onDialogChange("result");
          }}
        />
      )}

      {dialog === "result" && quiz.result && (
        <ResultDialog
          result={quiz.result}
          elapsed={quiz.elapsed}
          onReview={() => onDialogChange(null)}
          onRetry={() => {
            quiz.reset();
            onCloseZoom();
            onDialogChange(null);
          }}
        />
      )}
    </>
  );
}
