import { useEffect, useState } from "react";
import { useQuiz } from "../hooks/useQuiz";
import { useQuizShortcuts } from "../hooks/useQuizShortcuts";
import { useGuestTrial } from "../hooks/useGuestTrial";
import { useAuth } from "../context/AuthContext";
import { Header } from "../components/layout/Header";
import { Landing } from "../components/landing/Landing";
import { QuizDialogs, type SubmitDialog } from "../components/dialogs/QuizDialogs";
import { TrialEndedDialog } from "../components/dialogs/TrialEndedDialog";
import { QuizWorkspace } from "../components/quiz/QuizWorkspace";

export default function PracticePage() {
  const quiz = useQuiz();
  const { user } = useAuth();
  const trial = useGuestTrial();
  const [zoomOpen, setZoomOpen] = useState(false);
  const [dialog, setDialog] = useState<SubmitDialog>(null);
  const [trialEnded, setTrialEnded] = useState(false);

  const hasQuiz = quiz.questions.length > 0;
  const anyDialogOpen = !!dialog || !!quiz.pending || quiz.notFound || trialEnded;

  // Đang mở hộp thoại thì tắt phím tắt để tránh bấm nhầm đáp án
  useQuizShortcuts(quiz, hasQuiz && !anyDialogOpen);

  // Khách nộp bài xong là hết lượt thử; lần mở đề sau sẽ mời đăng ký
  useEffect(() => {
    if (!user && quiz.submitted) trial.markUsed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.submitted, user]);

  const pick: typeof quiz.loadFolder = (files, name) => {
    if (!user && trial.used) {
      setTrialEnded(true);
      return Promise.resolve();
    }
    return quiz.loadFolder(files, name);
  };

  return (
    <div className="flex h-screen flex-col">
      <Header
        title={quiz.title}
        mode={quiz.mode}
        loaded={hasQuiz}
        submitted={quiz.submitted}
        elapsed={quiz.elapsed}
        onPick={pick}
        onSubmit={() => setDialog("confirm")}
        onReset={quiz.reset}
        onShowResult={() => setDialog("result")}
      />

      <QuizDialogs quiz={quiz} dialog={dialog} onDialogChange={setDialog} onCloseZoom={() => setZoomOpen(false)} />
      {trialEnded && <TrialEndedDialog onClose={() => setTrialEnded(false)} />}

      {hasQuiz ? (
        <QuizWorkspace quiz={quiz} zoomOpen={zoomOpen} onZoomChange={setZoomOpen} />
      ) : (
        <Landing onPick={pick} userName={user?.fullName} trialUsed={trial.used} />
      )}
    </div>
  );
}
