import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ApiError } from "@/shared/api/client";
import { historyApi } from "@/features/history/history.api";
import { pendingAttempt } from "@/features/guest-sync/pendingAttempt";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import { sessionApi } from "@/features/practice-session/session.api";
import { useSessionSync } from "@/features/practice-session/useSessionSync";
import { useLeaveWarning } from "@/shared/hooks/useLeaveWarning";
import { useExamAnswersLive } from "@/features/practice/hooks/useExamAnswersLive";
import { useExamQuestionsLive } from "@/features/practice/hooks/useExamQuestionsLive";
import { useToast } from "@/shared/context/ToastContext";
import { useQuiz } from "@/features/practice/hooks/useQuiz";
import { useQuizShortcuts } from "@/features/practice/hooks/useQuizShortcuts";
import { useGuestTrial } from "@/features/trial/useGuestTrial";
import { useAuth } from "@/features/auth/AuthContext";
import { Header } from "@/features/practice/components/Header";
import { Landing } from "@/features/landing/Landing";
import { QuizDialogs, type SubmitDialog } from "@/features/practice/components/dialogs/QuizDialogs";
import { ReferenceDialog } from "@/features/practice/components/dialogs/ReferenceDialog";
import { TrialEndedDialog } from "@/features/trial/TrialEndedDialog";
import { TriangleAlert } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
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
  const [referencesOpen, setReferencesOpen] = useState(false); // đang xem tài liệu tham khảo của đề
  const [bestScore, setBestScore] = useState<number | null>(null); // điểm cao nhất của người dùng ở đề đang mở

  const hasQuiz = quiz.questions.length > 0;
  const anyDialogOpen = !!dialog || !!quiz.pending || quiz.notFound || trialEnded || referencesOpen;

  // Lưu tiến độ lên server để tải lại trang vẫn làm tiếp được (chỉ với đề của hệ thống)
  const { flush } = useSessionSync(quiz);
  // Đề mở từ thư mục không lưu ở đâu cả: có đáp án rồi mà đóng/tải lại trang là mất, nên hỏi lại
  useLeaveWarning(hasQuiz && quiz.examId === null && !quiz.submitted && quiz.answeredCount > 0);

  // Bấm logo: về trang chủ (đề đang làm của hệ thống đã được lưu, vào lại từ danh sách "làm dở" để làm tiếp)
  const [leaveAsk, setLeaveAsk] = useState(false); // hộp thoại hỏi trước khi bỏ bài làm chưa lưu
  const leaveHome = () => {
    void flush();
    quiz.closeExam();
  };
  const goHome = () => {
    if (quiz.examId === null && !quiz.submitted && quiz.answeredCount > 0) {
      setLeaveAsk(true); // chặn điều hướng, chờ người dùng chọn trong hộp thoại
      return false;
    }
    leaveHome();
    return true;
  };

  // Điểm cao nhất ở đề này (chỉ thành viên, đề của hệ thống); nạp lại sau mỗi lần nộp được lưu
  const loadBest = (examId: number) =>
    historyApi
      .summary(examId)
      .then((s) => setBestScore(s.bestScore))
      .catch(() => undefined);
  useEffect(() => {
    setBestScore(null);
    if (user && quiz.examId !== null) void loadBest(quiz.examId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, quiz.examId]);

  // Đồng hồ bắt đầu chạy (đề có đáp án rồi): báo cho học viên biết giờ đã được tính
  const wasTiming = useRef(false);
  useEffect(() => {
    if (quiz.timing && !wasTiming.current && quiz.elapsed === 0) toast.success("Bắt đầu tính giờ làm bài");
    wasTiming.current = quiz.timing;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.timing]);

  // Đang mở hộp thoại thì tắt phím tắt để tránh bấm nhầm đáp án
  const requestSubmit = () => {
    setZoomOpen(false);
    setDialog("confirm");
  };
  const canSubmit = !quiz.submitted && !quiz.answersPending && !quiz.loadingMore;
  useQuizShortcuts(quiz, hasQuiz && !anyDialogOpen, canSubmit ? requestSubmit : undefined);

  // Khách nộp bài xong là hết lượt thử; lần mở đề sau sẽ mời đăng ký
  useEffect(() => {
    if (!user && quiz.submitted) trial.markUsed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.submitted, user]);

  // Chế độ Thi có giới hạn thời gian: nhắc khi còn 5 phút và 1 phút, hết giờ thì tự nộp bài và chấm điểm
  const timeLeft = quiz.timeLimitSec ? quiz.timeLimitSec - quiz.elapsed : null;
  useEffect(() => {
    if (timeLeft === null || !quiz.timing || quiz.submitted) return;
    if (timeLeft <= 0) {
      quiz.submit();
      setZoomOpen(false);
      setDialog("result");
      toast.success("Hết giờ làm bài, hệ thống đã tự nộp bài cho bạn");
    } else if (timeLeft === 300) toast.error("Còn 5 phút");
    else if (timeLeft === 60) toast.error("Còn 1 phút");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  // AI đang phân tích đáp án: kết quả (thành công hoặc lỗi) về qua socket ngay khi có.
  useExamAnswersLive(quiz.examId, quiz.answerSource === "PENDING", (r) => {
    if (r.status === "PENDING") return; // vẫn đang xử lý: giữ nguyên trạng thái chờ
    if (r.status === "FAILED" || r.status === "DEFAULT") {
      quiz.markFailed();
      toast.error("Chưa lấy được đáp án của đề này");
      return;
    }
    quiz.applyAnswers(r.answers, r.status, r.references);
    toast.success("Đáp án đã sẵn sàng, bạn có thể làm bài");
  });

  // Đề còn đang được lấy về: các câu mới hiện dần qua socket. Lấy thất bại thì đề bị gỡ, thoát ra trang chủ.
  useExamQuestionsLive(
    quiz.examId ?? quiz.pendingExamId,
    quiz.loadingMore || quiz.pendingLoadingMore,
    (r) => quiz.appendQuestions(r.questions, r.total),
    (message) => {
      quiz.closeExam();
      toast.error(`Lấy đề thất bại: ${message}`);
      navigate("/", { replace: true });
    },
  );

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
      .then(() => {
        toast.success("Đã lưu vào lịch sử làm bài");
        if (quiz.examId !== null) void loadBest(quiz.examId);
      })
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
    const params = new URLSearchParams(location.search);
    const sessionId = Number(params.get("session")) || null; // có thì làm tiếp đúng lượt đó
    Promise.all([examImportApi.examByThread(threadId), sessionId ? sessionApi.get(sessionId).catch(() => null) : Promise.resolve(null)])
      .then(([exam, saved]) => {
        if (stale) return;
        loadedFor.current = threadId; // đã tải xong đề này
        setOpenedThread(exam.threadId);
        const mode = params.get("mode");
        if (saved && saved.examId === exam.id && saved.status === "IN_PROGRESS") {
          quiz.openExam(exam.questions, exam.title, exam.id, saved.mode === "EXAM" ? "exam" : "practice", exam.answerStatus, exam.totalQuestions, {
            sessionId: saved.id,
            answers: saved.answers,
            checked: saved.checked,
            flagged: saved.flagged,
            current: saved.current,
            elapsedSec: saved.elapsedSec,
          });
        } else if (mode === "practice" || mode === "exam") quiz.openExam(exam.questions, exam.title, exam.id, mode, exam.answerStatus, exam.totalQuestions);
        else quiz.loadExam(exam.questions, exam.title, exam.id, exam.answerStatus, exam.totalQuestions);
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
    const target = openedId !== null && openedThread ? `/exam/${openedThread}?mode=${quiz.mode}${quiz.sessionId ? `&session=${quiz.sessionId}` : ""}` : "/";
    if (location.pathname + location.search !== target) navigate(target, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasQuiz, openedId, openedThread, quiz.mode, quiz.sessionId]);

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
        submitLocked={quiz.answersPending}
        elapsed={quiz.elapsed}
        timeLimitSec={quiz.timeLimitSec}
        bestScore={bestScore}
        referenceCount={quiz.references.length}
        onShowReferences={() => setReferencesOpen(true)}
        timing={quiz.timing}
        onHome={goHome}
        onSubmit={() => setDialog("confirm")}
        onReset={quiz.reset}
        onShowResult={() => setDialog("result")}
      />

      <QuizDialogs quiz={quiz} dialog={dialog} onDialogChange={setDialog} onCloseZoom={() => setZoomOpen(false)} />
      {leaveAsk && (
        <Modal onClose={() => setLeaveAsk(false)}>
          <ModalTitle icon={TriangleAlert}>Thoát và bỏ bài đang làm?</ModalTitle>
          <p className="md-body-medium mt-3 text-on-surface-variant">
            Bạn đã trả lời <b className="text-on-surface">{quiz.answeredCount} câu</b> của đề mở từ thư mục. Đề này không được lưu trên hệ thống nên đáp án sẽ <b className="text-on-surface">mất hẳn, không khôi phục được</b>.
          </p>
          <ModalActions>
            <Button autoFocus onClick={() => setLeaveAsk(false)}>
              Ở lại làm tiếp
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setLeaveAsk(false);
                leaveHome();
                navigate("/");
              }}
            >
              Bỏ bài và thoát
            </Button>
          </ModalActions>
        </Modal>
      )}
      {trialEnded && <TrialEndedDialog onClose={() => setTrialEnded(false)} />}
      {referencesOpen && quiz.references.length > 0 && <ReferenceDialog references={quiz.references} onClose={() => setReferencesOpen(false)} />}

      {hasQuiz ? (
        <QuizWorkspace quiz={quiz} zoomOpen={zoomOpen} onZoomChange={setZoomOpen} onSubmit={requestSubmit} />
      ) : opening ? (
        <div className="flex flex-1 items-center justify-center bg-surface">
          <Loading label="Đang mở đề…" />
        </div>
      ) : (
        <Landing onPick={pick} onImported={(exam) => navigate(`/exam/${exam.threadId}`)} userName={user?.fullName} />
      )}
    </div>
  );
}
