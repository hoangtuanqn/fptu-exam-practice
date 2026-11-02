import { useState } from "react";
import { useQuiz } from "../hooks/useQuiz";
import { useQuizShortcuts } from "../hooks/useQuizShortcuts";
import { EmptyState } from "../components/layout/EmptyState";
import { Header } from "../components/layout/Header";
import { QuizDialogs, type SubmitDialog } from "../components/dialogs/QuizDialogs";
import { QuizWorkspace } from "../components/quiz/QuizWorkspace";

export default function PracticePage() {
  const quiz = useQuiz();
  const [zoomOpen, setZoomOpen] = useState(false);
  const [dialog, setDialog] = useState<SubmitDialog>(null);

  const hasQuiz = quiz.questions.length > 0;
  const anyDialogOpen = !!dialog || !!quiz.pending || quiz.notFound;

  // Đang mở hộp thoại thì tắt phím tắt để tránh bấm nhầm đáp án
  useQuizShortcuts(quiz, hasQuiz && !anyDialogOpen);

  return (
    <div className="flex h-screen flex-col">
      <Header
        title={quiz.title}
        mode={quiz.mode}
        loaded={hasQuiz}
        submitted={quiz.submitted}
        elapsed={quiz.elapsed}
        onPick={quiz.loadFolder}
        onSubmit={() => setDialog("confirm")}
        onReset={quiz.reset}
        onShowResult={() => setDialog("result")}
      />

      <QuizDialogs quiz={quiz} dialog={dialog} onDialogChange={setDialog} onCloseZoom={() => setZoomOpen(false)} />

      {hasQuiz ? (
        <QuizWorkspace quiz={quiz} zoomOpen={zoomOpen} onZoomChange={setZoomOpen} />
      ) : (
        <EmptyState onPick={quiz.loadFolder} />
      )}
    </div>
  );
}
