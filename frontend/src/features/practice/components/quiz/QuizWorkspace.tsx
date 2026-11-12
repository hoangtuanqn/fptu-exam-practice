import { useState } from "react";
import { ExplainBundleBanner } from "@/features/explanation/ExplainBundleBanner";
import { ExplainConfirmDialog } from "@/features/explanation/ExplainConfirmDialog";
import { ExplainUnlockDialog } from "@/features/explanation/ExplainUnlockDialog";
import { WrongAnswerNudge } from "@/features/explanation/WrongAnswerNudge";
import { ExplainPanel } from "@/features/explanation/ExplainPanel";
import { explanationApi } from "@/features/explanation/explanation.api";
import { useApi } from "@/shared/hooks/useApi";
import { ReportAnswerDialog } from "@/features/answer-report/ReportAnswerDialog";
import { useAuth } from "@/features/auth/AuthContext";
import { useExamTopicsLive } from "@/features/practice/hooks/useExamTopicsLive";
import { usePreloadImages } from "@/features/practice/hooks/usePreloadImages";
import type { Quiz } from "@/features/practice/hooks/useQuiz";
import { Sidebar } from "@/features/practice/components/sidebar/Sidebar";
import { AnswerPendingBanner } from "./AnswerPendingBanner";
import { LoadingMoreBanner } from "./LoadingMoreBanner";
import { ImageViewer } from "./ImageViewer";
import { QuestionCard } from "./QuestionCard";
import type { QuestionViewProps } from "./types";

interface Props {
  quiz: Quiz;
  zoomOpen: boolean;
  onZoomChange: (open: boolean) => void;
  onSubmit: () => void; // mở hộp xác nhận nộp bài
}

// Màn hình làm bài: sidebar danh sách câu + khung câu hỏi + (tuỳ chọn) cửa sổ phóng to ảnh
export function QuizWorkspace({ quiz, zoomOpen, onZoomChange, onSubmit }: Props) {
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [confirmExplain, setConfirmExplain] = useState(false); // hộp xác nhận phí (chỉ lần đầu mỗi câu)
  const [panel, setPanel] = useState<{ number: number; firstTime: boolean; useFreeTurn?: boolean } | null>(null); // lời giải đang mở cạnh đề
  const [bought, setBought] = useState<Set<number>>(new Set()); // câu vừa mua lời giải trong phiên này (cộng với danh sách từ server)
  const explainEnabled = !!user && quiz.examId !== null;
  const info = useApi(() => (explainEnabled ? explanationApi.info(quiz.examId!) : Promise.resolve(null)), [explainEnabled, quiz.examId]);
  const [reported, setReported] = useState<Set<number>>(new Set()); // các câu đã báo cáo trong phiên này
  const [unlockOpen, setUnlockOpen] = useState(false); // hộp xác nhận mở khóa cả đề
  const [bannerCollapsed, setBannerCollapsed] = useState(false); // thẻ ưu đãi thu thành viên thuốc
  usePreloadImages(quiz);
  const topicsLabeling = useExamTopicsLive(quiz.examId, quiz.applyTopics); // đề còn câu chưa có chủ đề: máy chủ gắn nền, hiện hiệu ứng chờ
  const showTopic = quiz.mode === "practice" || quiz.submitted; // thi: chủ đề chỉ hiện sau khi nộp bài

  const question = quiz.questions[quiz.current];
  if (!question) return null;

  // Báo cáo đáp án sai: chỉ với đề của hệ thống, đã đăng nhập, và khi câu này đã có kết quả (đáp án đã chắc chắn)
  const canReport = !!user && quiz.examId !== null && quiz.isRevealed(question) && !question.answerPending && question.correct.length > 0;

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

  const view: QuestionViewProps = {
    question,
    total: quiz.questions.length,
    selected: quiz.answers[question.number] ?? [],
    revealed: quiz.isRevealed(question),
    canCheck: quiz.canCheck(question),
    hasPrev: quiz.current > 0,
    hasNext: quiz.current < quiz.questions.length - 1,
    flagged: !!quiz.flagged[question.number],
    onToggleFlag: () => quiz.toggleFlag(question.number),
    onReport: canReport ? () => setReportOpen(true) : undefined,
    onExplain: canReport && info.data ? openExplain : undefined,
    explainBought,
    explainFree,
    reported: reported.has(question.number),
    onChoose: (option) => quiz.choose(question, option),
    onCheck: () => quiz.check(question),
    onPrev: quiz.prev,
    onNext: quiz.next,
    // Câu cuối thì nút "Tiếp" thành "Nộp bài" (không khi đã nộp, chờ AI, hoặc đề còn đang được lấy về)
    onSubmit: !quiz.submitted && !quiz.answersPending && !quiz.loadingMore ? onSubmit : undefined,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <Sidebar quiz={quiz} />
      <main className={`flex min-w-0 flex-1 flex-col overflow-y-auto p-2 sm:p-3 lg:p-4 ${panelOpen ? "max-lg:pb-[60dvh]" : ""}`}>
        {quiz.loadingMore && <LoadingMoreBanner loaded={quiz.questions.length} total={quiz.total} />}
        <AnswerPendingBanner source={quiz.answerSource} examId={quiz.examId} onRetry={quiz.waitForAnswers} />
        {showBundle && bundle && (
          <ExplainBundleBanner bundle={bundle} unitPrice={info.data!.price} collapsed={bannerCollapsed} onCollapse={() => setBannerCollapsed(true)} onUnlock={() => setUnlockOpen(true)} />
        )}
        <QuestionCard key={question.number} {...view} nudge={nudge} topic={showTopic ? question.topic : null} topicLoading={showTopic && topicsLabeling} onZoom={() => onZoomChange(true)} />
      </main>

      {panelOpen && quiz.examId !== null && (
        <ExplainPanel
          key={question.number}
          examId={quiz.examId}
          questionNumber={question.number}
          firstTime={panel!.firstTime}
          useFreeTurn={panel!.useFreeTurn}
          chat={!(quiz.timing && (quiz.mode === "exam" || quiz.timeLimitSec !== null))} // đồng hồ thi còn chạy thì không mở hỏi AI
          onClose={() => setPanel(null)}
          onBought={() => {
            setBought((prev) => new Set(prev).add(question.number));
            info.reload(); // cập nhật số lượt xem thử còn lại và giá gói
          }}
        />
      )}

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

      {zoomOpen && <ImageViewer {...view} onClose={() => onZoomChange(false)} />}
    </div>
  );
}
