import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { examApi } from "@/features/exam/exam.api";
import { historyApi } from "@/features/history/history.api";
import { Header } from "@/features/practice/components/Header";
import { QuizWorkspace } from "@/features/practice/components/quiz/QuizWorkspace";
import { ReferenceDialog } from "@/features/practice/components/dialogs/ReferenceDialog";
import { useQuiz } from "@/features/practice/hooks/useQuiz";
import { errorMessage } from "@/shared/api/errors";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";

// Xem lại bài đã nộp trong đúng giao diện làm bài: mở đề với đáp án đã chọn, chỉ xem (không nộp, lưu, đánh dấu, báo cáo)
export default function AttemptReviewPage() {
  const id = useParams().id ?? "";
  const startAt = Number(useSearchParams()[0].get("q"));
  const quiz = useQuiz();
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [referencesOpen, setReferencesOpen] = useState(false);

  useEffect(() => {
    let stale = false;
    setError(null);
    historyApi
      .get(id)
      .then(async (attempt) => {
        const exam = await examApi.exam(attempt.exam.id);
        if (stale) return;
        const answers = Object.fromEntries(attempt.details.map((d) => [d.number, d.chosen]));
        const items = exam.questions.filter((q) => !q.isReference);
        const current = Math.max(0, items.findIndex((q) => q.number === startAt));
        quiz.openExam(exam.questions, exam.title, exam.id, attempt.mode === "EXAM" ? "exam" : "practice", exam.answerStatus, exam.totalQuestions, {
          sessionId: attempt.id,
          answers,
          checked: {},
          flagged: {},
          current,
          elapsedSec: attempt.durationSec,
          submitted: true,
        });
        setReady(true);
      })
      .catch((err: unknown) => !stale && setError(errorMessage(err, "Không mở được bài làm này")));
    return () => {
      stale = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chỉ nạp lại khi đổi bài làm
  }, [id]);

  return (
    <div className="flex h-[calc(100dvh-var(--bottom-nav-h,0px))] flex-col" data-no-bottom-nav>
      <Header
        title={quiz.title}
        mode={quiz.mode}
        loaded={ready}
        submitted
        elapsed={quiz.elapsed}
        timing={false}
        referenceCount={quiz.references.length}
        onShowReferences={() => setReferencesOpen(true)}
        onHome={() => true}
        onSubmit={() => undefined}
        onReset={() => undefined}
        onShowResult={() => undefined}
        reviewBackTo={`/account/attempts/${id}`}
      />
      {error ? <ErrorBox message={error} /> : !ready ? <Loading label="Đang mở bài làm…" /> : <QuizWorkspace quiz={quiz} zoomOpen={zoomOpen} onZoomChange={setZoomOpen} onSubmit={() => undefined} readOnly />}
      {referencesOpen && <ReferenceDialog references={quiz.references} attachments={[]} onClose={() => setReferencesOpen(false)} />}
    </div>
  );
}
