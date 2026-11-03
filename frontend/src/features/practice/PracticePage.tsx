import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "@/shared/api/client";
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
import { Loading } from "@/shared/ui/Feedback";
import { QuizWorkspace } from "@/features/practice/components/quiz/QuizWorkspace";

interface Props {
  threadId?: string; // có khi đang ở địa chỉ /exam/:threadId (mã thread FuOverflow, công khai, không phải ID nội bộ)
}

// Trang luyện đề. Địa chỉ phản ánh đề đang mở: "/" là trang chủ, "/exam/:threadId" là đề của hệ thống,
// "/exam/:threadId?mode=exam" mở thẳng vào chế độ thi. Sao chép địa chỉ là gửi được đúng đề đó (người mở cần có đề trong kho).
export default function PracticePage({ threadId }: Props) {
  const quiz = useQuiz();
  const { user } = useAuth();
  const trial = useGuestTrial();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [opening, setOpening] = useState(false); // đang tải đề theo địa chỉ
  const loadedFor = useRef<string | null>(null);
  const [openedThread, setOpenedThread] = useState<string | null>(null); // mã thread của đề đang làm
  const openedId = quiz.examId;
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

  // AI đang phân tích đáp án: hỏi lại định kỳ, có đáp án thì gắn vào đề đang làm (câu đã chọn giữ nguyên).
  // Tiết kiệm: tab đang ẩn thì không hỏi (quay lại tab là hỏi ngay), chờ lâu thì hỏi thưa hơn.
  const waitingAnswers = quiz.answersPending && quiz.examId !== null;
  useEffect(() => {
    if (!waitingAnswers || quiz.examId === null) return;
    const examId = quiz.examId;
    const startedAt = Date.now();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const tick = async () => {
      if (stopped || document.hidden) return;
      try {
        const r = await examImportApi.answers(examId);
        if (stopped || r.status === "PENDING") return;
        stopped = true;
        quiz.applyAnswers(r.answers, r.status);
        if (r.status === "DEFAULT") toast.error("AI chưa phân tích được đáp án, đang dùng đáp án tạm (A)");
        else toast.success("AI đã phân tích xong đáp án");
      } catch {
        /* lỗi mạng tạm thời: lần sau hỏi lại */
      }
    };
    const loop = () => {
      timer = setTimeout(async () => {
        await tick();
        if (!stopped) loop();
      }, Date.now() - startedAt > 120_000 ? 10_000 : 5_000);
    };
    const onVisible = () => !document.hidden && void tick();
    document.addEventListener("visibilitychange", onVisible);
    loop();
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitingAnswers, quiz.examId]);

  // Nộp bài xong: thành viên thì ghi vào lịch sử (chỉ với đề của hệ thống; đề mở từ thư mục không có trong DB).
  // Khách thì giữ bài lại, lưu khi họ đăng ký/đăng nhập (xem GuestSync).
  // Chờ có đáp án rồi mới lưu: lưu lúc AI chưa xong sẽ ghi điểm sai.
  const savedFor = useRef<number | null>(null);
  useEffect(() => {
    if (!quiz.submitted) {
      savedFor.current = null;
      return;
    }
    if (quiz.examId === null || quiz.answersPending || savedFor.current === quiz.session) return;
    savedFor.current = quiz.session;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.submitted, quiz.answersPending]);

  // Vào /exam/:threadId thì tải đề đó: có ?mode=practice|exam thì làm bài luôn, không thì hỏi chọn chế độ
  useEffect(() => {
    if (!threadId) {
      loadedFor.current = null;
      return;
    }

    let stale = false;
    setOpening(true);
    examImportApi
      .examByThread(threadId)
      .then((exam) => {
        if (stale) return;
        loadedFor.current = threadId; // đã tải xong đề này
        setOpenedThread(exam.threadId);
        const mode = new URLSearchParams(location.search).get("mode");
        if (mode === "practice" || mode === "exam") quiz.openExam(exam.questions, exam.title, exam.id, mode, exam.answerStatus);
        else quiz.loadExam(exam.questions, exam.title, exam.id, exam.answerStatus);
      })
      .catch((err: unknown) => {
        if (stale) return;
        toast.error(
          err instanceof ApiError && err.status === 404
            ? "Bạn chưa có đề này. Hãy lấy đề từ link FuOverflow ở trang chủ."
            : "Không mở được đề này",
        );
        navigate("/", { replace: true });
      })
      .finally(() => !stale && setOpening(false));
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threadId]);

  // Địa chỉ luôn khớp với đề đang làm: đề hệ thống -> /exam/:threadId?mode=..., đề mở từ thư mục -> "/"
  useEffect(() => {
    if (!hasQuiz) return;
    const target = openedId !== null && openedThread ? `/exam/${openedThread}?mode=${quiz.mode}` : "/";
    if (location.pathname + location.search !== target) navigate(target, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasQuiz, openedId, openedThread, quiz.mode]);

  // Đang ở /exam/:threadId mà huỷ hộp thoại chọn chế độ thì về trang chủ
  useEffect(() => {
    if (threadId && !hasQuiz && !quiz.pending && !opening && loadedFor.current === threadId) navigate("/", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.pending]);

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
      ) : opening ? (
        <div className="flex flex-1 items-center justify-center bg-paper">
          <Loading label="Đang mở đề…" />
        </div>
      ) : (
        <Landing onPick={pick} onImported={(exam) => navigate(`/exam/${exam.threadId}`)} userName={user?.fullName} trialUsed={trial.used} />
      )}
    </div>
  );
}
