import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Layers } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { Header } from "@/features/practice/components/Header";
import { QuizWorkspace } from "@/features/practice/components/quiz/QuizWorkspace";
import { Sidebar } from "@/features/practice/components/sidebar/Sidebar";
import { useQuiz } from "@/features/practice/hooks/useQuiz";
import { useKeydown } from "@/features/practice/hooks/useKeydown";
import type { Question } from "@/features/practice/types";
import { useApi } from "@/shared/hooks/useApi";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { buttonClass } from "@/shared/ui/Button";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { flashcardApi, type FlashcardResult } from "./flashcard.api";
import { LockedPanel } from "./LockedPanel";

// /flashcard/:code: dùng đúng giao diện của trang luyện đề (chế độ luyện tập): Header, danh sách câu, khung câu hỏi, chọn đáp án A–H
// là chính các thành phần của trang đó, chỉ khác là không lưu bài làm, không nộp bài.
export default function FlashcardSubjectPage() {
  const code = (useParams().code ?? "").toUpperCase();
  const { user } = useAuth();
  // Tải lại khi đăng nhập/đổi tài khoản/mua Pro: máy chủ cắt thẻ theo người đang xem
  const q = useApi(() => flashcardApi.subject(code), [code, user?.id, user?.proExpiresAt]);

  return (
    // Giống trang làm đề: chiếm đúng chiều cao màn hình, ẩn thanh điều hướng dưới
    <div className="flex h-[calc(100dvh-var(--bottom-nav-h,0px))] flex-col bg-surface" data-no-bottom-nav>
      {q.data ? <Viewer key={`${code}:${q.data.items.length}:${q.data.locked}`} code={code} data={q.data} /> : q.error ? <ErrorBox message={q.error} onRetry={q.reload} /> : <Loading label="Đang tải flashcard…" />}
    </div>
  );
}

function Viewer({ code, data }: { code: string; data: FlashcardResult }) {
  const quiz = useQuiz();
  const [url, setUrl] = useUrlState({ q: "1" }); // ?q=34: mở đúng câu, tải lại trang không mất chỗ
  const [zoomOpen, setZoomOpen] = useState(false);
  const started = useRef(false); // đã mở bộ thẻ vào useQuiz
  const synced = useRef(false); // đã nhảy tới câu trong ?q=

  // Gói thường chỉ có các thẻ xem trước: thẻ bị khoá là một ô cuối (như đề xem thử), bấm vào hiện lời mời mua Pro
  useEffect(() => {
    if (started.current || data.total === 0) return;
    started.current = true;
    const cards: Question[] = data.items.map((it) => ({ number: it.number, imageUrl: it.imageUrl, correct: it.answer }));
    quiz.openExam(cards, `Flashcard ${code}`, null, "practice", "MANUAL", cards.length);
    quiz.setTrialLocked(data.locked ? 1 : 0);
  });

  useEffect(() => {
    if (synced.current || quiz.slots === 0) return;
    synced.current = true;
    quiz.goTo((Math.floor(Number(url.q)) || 1) - 1);
  });
  useEffect(() => {
    if (synced.current) setUrl({ q: String(quiz.current + 1) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quiz.current]);

  // Đáp án chỉ hiện cho đúng câu đang xem: sang câu khác là tự ẩn
  const [shownAt, setShownAt] = useState<number | null>(null);
  const flashcard = { shown: shownAt === quiz.current, onToggle: () => setShownAt((s) => (s === quiz.current ? null : quiz.current)) };

  // ← → chuyển câu, Space hiện/ẩn đáp án (không có phím chọn A–H như làm đề)
  useKeydown((e) => {
    const t = e.target;
    if (e.isComposing || e.altKey || e.ctrlKey || e.metaKey) return;
    if (t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (e.key === "ArrowRight") quiz.next();
    else if (e.key === "ArrowLeft") quiz.prev();
    else if (e.key === " " && !(t instanceof HTMLElement && /^(BUTTON|A)$/.test(t.tagName)) && quiz.current < quiz.questions.length) {
      e.preventDefault();
      flashcard.onToggle();
    }
  }, !zoomOpen && quiz.slots > 0);

  if (data.total === 0)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-4">
        <Empty icon={Layers} title={`Môn ${code} chưa có flashcard`}>
          Bạn quay lại sau hoặc chọn môn khác.
        </Empty>
        <Link to="/flashcard" className={buttonClass({ variant: "tonal" })}>
          <ArrowLeft size={16} /> Tất cả môn
        </Link>
      </div>
    );

  const atLock = quiz.questions.length > 0 && quiz.current >= quiz.questions.length;

  return (
    <>
      <Header
        title={`Flashcard ${code}`}
        mode="practice"
        loaded
        submitted={false}
        elapsed={0}
        timing={false}
        onHome={() => true}
        onSubmit={() => undefined}
        onReset={() => undefined}
        onShowResult={() => undefined}
        reviewBackTo="/flashcard"
        backLabel="Tất cả môn"
      />
      {atLock ? (
        <div className="relative flex min-h-0 flex-1 flex-col lg:flex-row">
          <Sidebar quiz={quiz} jump flashcard={flashcard} />
          <main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-2 sm:p-3 lg:p-4 land:pb-16">
            <div className="mx-auto w-full max-w-xl pt-6">
              <LockedPanel hidden={data.hidden} onClose={() => quiz.goTo(0)} />
            </div>
          </main>
        </div>
      ) : (
        <QuizWorkspace quiz={quiz} zoomOpen={zoomOpen} onZoomChange={setZoomOpen} onSubmit={() => undefined} readOnly jump flashcard={flashcard} />
      )}
    </>
  );
}
