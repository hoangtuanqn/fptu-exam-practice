import type { Quiz } from "@/features/practice/hooks/useQuiz";
import type { TopicSummary } from "@/features/history/types";
import { ConfirmSubmitDialog } from "./ConfirmSubmitDialog";
import { NotFoundDialog } from "./NotFoundDialog";
import { ResultDialog } from "./ResultDialog";
import { StartDialog } from "./StartDialog";

export type SubmitDialog = "confirm" | "result" | null;

interface Props {
  quiz: Quiz;
  topicSummary: TopicSummary;
  dialog: SubmitDialog;
  onDialogChange: (dialog: SubmitDialog) => void;
  onCloseZoom: () => void;
}

// Quyết định hộp thoại nào đang hiện: bắt đầu / lỗi thư mục / xác nhận nộp / bảng điểm
export function QuizDialogs({ quiz, topicSummary, dialog, onDialogChange, onCloseZoom }: Props) {
  const { pending } = quiz;

  return (
    <>
      {pending && (
        <StartDialog
          title={pending.title}
          total={pending.questions.length}
          graded={pending.questions.filter((q) => q.correct.length > 0).length}
          answersPending={pending.answerSource === "PENDING"}
          replacing={quiz.questions.length > 0 && quiz.answeredCount > 0 && !quiz.submitted}
          onCancel={quiz.cancelPending}
          onStart={(mode, limitMin) => {
            quiz.startExam(mode, limitMin);
            onCloseZoom();
            onDialogChange(null);
          }}
        />
      )}

      {quiz.notFound && <NotFoundDialog onClose={quiz.dismissNotFound} />}

      {dialog === "confirm" && (
        <ConfirmSubmitDialog
          answered={quiz.answeredCount}
          answersPending={quiz.answersPending}
          savable={quiz.examId !== null}
          total={quiz.questions.length}
          flagged={quiz.questions.filter((q) => quiz.flagged[q.number]).map((q) => q.number)}
          unanswered={quiz.questions.filter((q) => !q.isReference && !(quiz.answers[q.number]?.length > 0)).map((q) => q.number)}
          onJump={(number) => {
            quiz.goTo(quiz.questions.findIndex((q) => q.number === number));
            onCloseZoom();
            onDialogChange(null);
          }}
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
          topicSummary={topicSummary}
          answersPending={quiz.answersPending}
          answerSource={quiz.answerSource}
          savable={quiz.examId !== null}
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
