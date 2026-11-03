import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import { historyApi } from "@/features/history/history.api";
import { pendingAttempt } from "@/features/guest-sync/pendingAttempt";
import { useToast } from "@/shared/context/ToastContext";
import { useQuiz } from "@/features/practice/hooks/useQuiz";
import { useQuizShortcuts } from "@/features/practice/hooks/useQuizShortcuts";
import { useGuestTrial } from "@/features/trial/useGuestTrial";
import { useAuth } from "@/features/auth/AuthContext";
import { Header } from "@/features/practice/components/Header";
import { Landing } from "@/features/landing/Landing";
import { QuizDialogs, type SubmitDialog } from "@/features/practice/components/dialogs/QuizDialogs";
import { TrialEndedDialog } from "@/features/trial/TrialEndedDialog";
import { QuizWorkspace } from "@/features/practice/components/quiz/QuizWorkspace";

export default function PracticePage() {
  const quiz = useQuiz();
  const { user } = useAuth();
  const trial = useGuestTrial();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
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

  // Nộp bài xong: thành viên thì ghi vào lịch sử ngay (chỉ với đề của hệ thống; đề mở từ thư mục không có trong DB).
  // Khách thì giữ bài lại, lưu khi họ đăng ký/đăng nhập (xem GuestSync).
  useEffect(() => {
    if (!quiz.submitted || quiz.examId === null) return;
    const payload = {
      mode: quiz.mode === "exam" ? ("EXAM" as const) : ("PRACTICE" as const),
      durationSec: quiz.elapsed,
      answers: quiz.answers,
    };
    if (!user) {
      pendingAttempt.save({ examId: quiz.examId, payload });
      return;
    }
    historyApi
      .save(quiz.examId, payload)
      .then(() => toast.success("Đã lưu vào lịch sử làm bài"))
      .catch(() => toast.error("Không lưu được lịch sử làm bài"));
    // Chỉ chạy đúng lúc vừa nộp bài
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.submitted]);

  // Mở đề từ liên kết /?exam=ID (ví dụ nút "Làm lại đề" ở lịch sử)
  const examParam = Number(params.get("exam"));
  useEffect(() => {
    if (!examParam || !user) return;
    setParams({}, { replace: true });
    examImportApi
      .exam(examParam)
      .then((exam) => quiz.loadExam(exam.questions, exam.title, exam.id))
      .catch(() => toast.error("Không mở được đề này"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examParam, user?.id]);

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
        <Landing onPick={pick} onImported={(exam) => quiz.loadExam(exam.questions, exam.title, exam.id)} userName={user?.fullName} trialUsed={trial.used} />
      )}
    </div>
  );
}
