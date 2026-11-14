import { canFullscreen } from "@/features/practice/hooks/useExamGuard";
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
  onCancelChoose: () => void; // đóng hộp thoại chọn chế độ của đề đã mở sẵn
  onBeforeSubmit?: () => void; // chạy ngay trước quiz.submit() (chốt lần rời bài thi đang mở)
  nextExam?: { remaining: number; onOpen: () => void }; // bộ đề theo chương nhiều đề: còn đề kế tiếp
}

// Quyết định hộp thoại nào đang hiện: bắt đầu / lỗi thư mục / xác nhận nộp / bảng điểm
export function QuizDialogs({ quiz, topicSummary, dialog, onDialogChange, onCloseZoom, onCancelChoose, onBeforeSubmit, nextExam }: Props) {
  const { pending } = quiz;

  return (
    <>
      {quiz.choosing && (
        <StartDialog
          title={quiz.title}
          total={quiz.questions.length}
          graded={quiz.questions.filter((q) => q.correct.length > 0).length}
          answersPending={quiz.answersPending}
          replacing={false}
          onCancel={onCancelChoose}
          onStart={(mode, limitMin) => {
            quiz.chooseMode(mode, limitMin);
            onCloseZoom();
            onDialogChange(null);
          }}
        />
      )}
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
            onBeforeSubmit?.();
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
          nextExam={nextExam}
          elapsed={quiz.elapsed}
          violations={quiz.mode === "exam" && canFullscreen ? quiz.violations : undefined}
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
