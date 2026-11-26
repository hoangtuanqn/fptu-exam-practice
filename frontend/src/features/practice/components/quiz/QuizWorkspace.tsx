import { useState } from "react";
import { ExplainBundleBanner } from "@/features/explanation/ExplainBundleBanner";
import { ExplainConfirmDialog } from "@/features/explanation/ExplainConfirmDialog";
import { ExplainUnlockDialog } from "@/features/explanation/ExplainUnlockDialog";
import { WrongAnswerNudge } from "@/features/explanation/WrongAnswerNudge";
import { ExplainPanel } from "@/features/explanation/ExplainPanel";
import { explanationApi } from "@/features/explanation/explanation.api";
import { savedApi } from "@/features/saved/saved.api";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { ReportAnswerDialog } from "@/features/answer-report/ReportAnswerDialog";
import { useAuth } from "@/features/auth/AuthContext";
import { useExamTopicsLive } from "@/features/practice/hooks/useExamTopicsLive";
import { useAutoNext } from "@/features/practice/hooks/useAutoNext";
import { usePreloadImages } from "@/features/practice/hooks/usePreloadImages";
import type { Quiz } from "@/features/practice/hooks/useQuiz";
import { Sidebar } from "@/features/practice/components/sidebar/Sidebar";
import { AnswerPendingBanner } from "./AnswerPendingBanner";
import { LoadingMoreBanner } from "./LoadingMoreBanner";
import { TrialLockBanner } from "@/features/exam-store/TrialLockBanner";
import { LockedQuestionCard } from "./LockedQuestionCard";
import { ImageViewer } from "./ImageViewer";
import { QuestionCard } from "./QuestionCard";
import type { QuestionViewProps } from "./types";
import type { FlashcardView } from "./FlashcardAnswer";

interface Props {
  quiz: Quiz;
  zoomOpen: boolean;
  onZoomChange: (open: boolean) => void;
  onSubmit: () => void; // mở hộp xác nhận nộp bài
  readOnly?: boolean; // xem lại bài đã nộp: bỏ các nút lưu, đánh dấu, báo cáo, giải thích, nộp bài
  jump?: boolean; // danh sách câu có ô gõ số để nhảy thẳng (bộ nhiều câu, ví dụ flashcard)
  flashcard?: FlashcardView; // flashcard: "Hiện đáp án" thay cho chọn A–H
}

// Màn hình làm bài: sidebar danh sách câu + khung câu hỏi + (tuỳ chọn) cửa sổ phóng to ảnh
export function QuizWorkspace({ quiz, zoomOpen, onZoomChange, onSubmit, readOnly, jump, flashcard }: Props) {
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmExplain, setConfirmExplain] = useState(false); // hộp xác nhận phí (chỉ lần đầu mỗi câu)
  const [panel, setPanel] = useState<{ number: number; firstTime: boolean; useFreeTurn?: boolean } | null>(null); // lời giải đang mở cạnh đề
  const [bought, setBought] = useState<Set<number>>(new Set()); // câu vừa mua lời giải trong phiên này (cộng với danh sách từ server)
  const explainEnabled = !readOnly && !!user && quiz.examId !== null;
  const info = useApi(() => (explainEnabled ? explanationApi.info(quiz.examId!) : Promise.resolve(null)), [explainEnabled, quiz.examId]);
  const [reported, setReported] = useState<Set<number>>(new Set()); // các câu đã báo cáo trong phiên này
  const toast = useToast();
  // Câu đã lưu của đề: tải một lần mỗi đề, sau đó cập nhật tại chỗ khi bấm lưu/bỏ lưu (khoá theo "đề:câu")
  const saveEnabled = !readOnly && !!user && quiz.examId !== null;
  // Đề xem thử chưa nằm trong kho của bạn nên chưa có danh sách câu đã lưu (máy chủ sẽ báo không tìm thấy đề)
  const savedLoadable = saveEnabled && quiz.trialLocked === 0;
  const savedOfExam = useApi(() => (savedLoadable ? savedApi.ofExam(quiz.examId!) : Promise.resolve(null)), [savedLoadable, quiz.examId]);
  const [savedChanged, setSavedChanged] = useState<Record<string, boolean>>({});
  const [unlockOpen, setUnlockOpen] = useState(false); // hộp xác nhận mở khóa cả đề
  const [bannerCollapsed, setBannerCollapsed] = useState(false); // thẻ ưu đãi thu thành viên thuốc
  usePreloadImages(quiz);
  const autoNext = useAutoNext(quiz);
  const topicsLabeling = useExamTopicsLive(quiz.examId, quiz.applyTopics); // đề còn câu chưa có chủ đề: máy chủ gắn nền, hiện hiệu ứng chờ
  const showTopic = quiz.mode === "practice" || quiz.submitted; // thi: chủ đề chỉ hiện sau khi nộp bài

  const question = quiz.questions[quiz.current];
  // Đề xem thử: đứng ở ô khoá (sau các câu đã mở) thì hiện thẻ mời mở khoá thay cho câu hỏi
  if (!question && quiz.trialLocked > 0 && quiz.current < quiz.slots && quiz.examId) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row land:pl-[env(safe-area-inset-left)] land:pr-[env(safe-area-inset-right)]">
        <Sidebar quiz={quiz} onSubmit={undefined} jump={jump} flashcard={flashcard} />
        <main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-2 sm:p-3 lg:p-4 land:pb-16">
          <LockedQuestionCard examId={quiz.examId} number={quiz.current + 1} total={Math.max(quiz.total, quiz.slots)} attempts={quiz.trialAttempts} onUnlocked={quiz.unlockTrial} onBack={quiz.prev} />
        </main>
      </div>
    );
  }
  if (!question) return null;

  // Báo cáo đáp án sai: chỉ với đề của hệ thống, đã đăng nhập, và khi câu này đã có kết quả (đáp án đã chắc chắn)
  const canReport = !readOnly && !!user && quiz.examId !== null && quiz.isRevealed(question) && !question.answerPending && question.correct.length > 0;

  const unlockedAll = !!info.data?.unlocked;
  const explainBought = unlockedAll || !!info.data?.purchased.includes(question.number) || bought.has(question.number);
  const bundle = info.data?.bundle;
  // Thẻ mời mua gói chỉ hiện khi đã nộp bài (đang làm bài thì không làm xao nhãng); lúc đó mới là lúc cần xem lời giải
  const showBundle = !!bundle && !bundle.unlocked && bundle.price > 0 && bundle.remaining > 1 && !quiz.answersPending && quiz.submitted;
  const trialsLeft = info.data?.freeTrialsLeft ?? 0;
  const explainFree = !explainBought && trialsLeft > 0;
  // Còn lượt xem thử thì mở thẳng (không hỏi phí); hết lượt mới hiện hộp xác nhận trả phí
  // Đã mua gói nhưng câu này chưa từng xem: vẫn hiện hiệu ứng "AI đang phân tích" như lần đầu (chỉ câu đã xem rồi mới tải nhanh)
  const seenBefore = !!info.data?.purchased.includes(question.number) || bought.has(question.number);
  const openExplain = () => (explainBought ? setPanel({ number: question.number, firstTime: !seenBefore }) : explainFree ? setPanel({ number: question.number, firstTime: true }) : setConfirmExplain(true));
  const panelOpen = panel?.number === question.number && quiz.examId !== null; // sang câu khác thì lời giải tự ẩn

  // Làm SAI một câu (đã hiện kết quả) mà chưa có lời giải: đúng lúc người học muốn biết lý do nhất, mời xem giải thích
  const selectedNow = quiz.answers[question.number] ?? [];
  const wrong = quiz.isRevealed(question) && selectedNow.length > 0 && question.correct.length > 0 && !(selectedNow.length === question.correct.length && selectedNow.every((a) => question.correct.includes(a)));
  const nudge =
    canReport && info.data && !explainBought && !panelOpen && wrong ? (
      <WrongAnswerNudge trialsLeft={trialsLeft} unitPrice={info.data.price} bundle={showBundle ? bundle : undefined} onExplain={openExplain} onUnlock={() => setUnlockOpen(true)} />
    ) : undefined;

  const savedKey = `${quiz.examId}:${question.number}`;
  const isSaved = savedChanged[savedKey] ?? (Array.isArray(savedOfExam.data) && savedOfExam.data.includes(question.number));
  const toggleSave = async () => {
    if (quiz.trialLocked > 0) return toast.error("Mở khoá đề để lưu câu này vào Câu đã lưu");
    const { number } = question;
    const next = !isSaved;
    try {
      await (next ? savedApi.save(quiz.examId!, number) : savedApi.remove(quiz.examId!, number));
      setSavedChanged((prev) => ({ ...prev, [savedKey]: next }));
      toast.success(next ? `Đã lưu câu ${number} vào Câu đã lưu` : `Đã bỏ lưu câu ${number}`);
    } catch (err) {
      toast.error(errorMessage(err, next ? "Chưa lưu được câu này" : "Chưa bỏ lưu được câu này"));
    }
  };

  const timerOf = quiz.mode === "exam" && quiz.timeLimitSec && !quiz.submitted && quiz.timing ? { left: Math.max(0, quiz.timeLimitSec - quiz.elapsed), limit: quiz.timeLimitSec } : undefined;

  const view: QuestionViewProps = {
    question,
    total: Math.max(quiz.total, quiz.slots),
    selected: quiz.answers[question.number] ?? [],
    revealed: quiz.isRevealed(question),
    canCheck: quiz.canCheck(question),
    hasPrev: quiz.current > 0,
    hasNext: quiz.current < quiz.slots - 1,
    flagged: !!quiz.flagged[question.number],
    onToggleFlag: readOnly ? undefined : () => quiz.toggleFlag(question.number),
    saved: isSaved,
    onToggleSave: saveEnabled ? () => void toggleSave() : undefined,
    onReport: canReport ? () => setReportOpen(true) : undefined,
    onExplain: canReport && info.data ? openExplain : undefined,
    explainBought,
    explainFree,
    reported: reported.has(question.number),
    autoNext: autoNext.on,
    onToggleAutoNext: !readOnly && autoNext.available ? autoNext.toggle : undefined,
    onChoose: (option) => quiz.choose(question, option),
    onCheck: () => quiz.check(question),
    onPrev: quiz.prev,
    onNext: quiz.next,
    // Câu cuối thì nút "Tiếp" thành "Nộp bài" (không khi đã nộp, chờ AI, hoặc đề còn đang được lấy về)
    flashcard,
    onSubmit: !readOnly && !quiz.submitted && !quiz.answersPending && !quiz.loadingMore && quiz.trialLocked === 0 ? onSubmit : undefined,
  };

  // Dùng chung cho màn hình làm bài và cửa sổ phóng to ảnh (chỉ gắn vào một nơi tại một thời điểm)
  const explainPanel = panelOpen && quiz.examId !== null && (
    <ExplainPanel
          key={question.number}
          examId={quiz.examId}
          questionNumber={question.number}
          firstTime={panel!.firstTime}
          useFreeTurn={panel!.useFreeTurn}
          chat={quiz.mode !== "exam" || quiz.submitted} // đang thi thì không mở hỏi AI
          onClose={() => setPanel(null)}
          onBought={() => {
            setBought((prev) => new Set(prev).add(question.number));
            info.reload(); // cập nhật số lượt xem thử còn lại và giá gói
          }}
        />
  );

  return (
    <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row land:pl-[env(safe-area-inset-left)] land:pr-[env(safe-area-inset-right)]">
      <Sidebar quiz={quiz} onSubmit={view.onSubmit} jump={jump} flashcard={flashcard} />
      <main className={`flex min-w-0 flex-1 flex-col overflow-y-auto p-2 sm:p-3 lg:p-4 land:p-1 ${panelOpen ? "max-lg:pb-[60dvh] land:pb-1 land:pr-[50%]" : ""}`}>
        {quiz.trialLocked > 0 && quiz.examId && <TrialLockBanner examId={quiz.examId} shown={quiz.questions.length} total={Math.max(quiz.total, quiz.slots)} onUnlocked={quiz.unlockTrial} />}
        {quiz.loadingMore && <LoadingMoreBanner loaded={quiz.questions.length} total={quiz.total} />}
        <AnswerPendingBanner source={quiz.answerSource} examId={quiz.examId} onRetry={quiz.waitForAnswers} />
        {showBundle && bundle && (
          <ExplainBundleBanner bundle={bundle} unitPrice={info.data!.price} collapsed={bannerCollapsed} onCollapse={() => setBannerCollapsed(true)} onUnlock={() => setUnlockOpen(true)} />
        )}
        <QuestionCard key={question.number} {...view} nudge={nudge} topic={showTopic ? question.topic : null} topicLoading={showTopic && topicsLabeling} onZoom={() => onZoomChange(true)} />
      </main>

      {!zoomOpen && explainPanel}

      {confirmExplain && info.data && (
        <ExplainConfirmDialog
          questionNumber={question.number}
          price={info.data.price}
          bundle={showBundle ? bundle : undefined}
          onBundle={() => {
            setConfirmExplain(false);
            setUnlockOpen(true);
          }}
          freeTurns={info.data.freeTurns}
          onUseFreeTurn={() => {
            setConfirmExplain(false);
            setPanel({ number: question.number, firstTime: true, useFreeTurn: true });
          }}
          onFreeTurnsChange={() => info.reload()}
          onCancel={() => setConfirmExplain(false)}
          onConfirm={() => {
            setConfirmExplain(false);
            setPanel({ number: question.number, firstTime: true });
          }}
        />
      )}

      {unlockOpen && bundle && quiz.examId !== null && (
        <ExplainUnlockDialog
          examId={quiz.examId}
          bundle={bundle}
          onCancel={() => setUnlockOpen(false)}
          onUnlocked={() => info.reload()}
        />
      )}

      {reportOpen && quiz.examId !== null && (
        <ReportAnswerDialog
          examId={quiz.examId}
          questionNumber={question.number}
          currentAnswer={question.correct}
          onClose={() => setReportOpen(false)}
          onSent={() => setReported((prev) => new Set(prev).add(question.number))}
        />
      )}

      {zoomOpen && <ImageViewer {...view} timer={timerOf} aside={explainPanel} onClose={() => onZoomChange(false)} />}
    </div>
  );
}
