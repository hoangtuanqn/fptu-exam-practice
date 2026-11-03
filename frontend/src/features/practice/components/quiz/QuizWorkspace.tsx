import { useState } from "react";
import { ReportAnswerDialog } from "@/features/answer-report/ReportAnswerDialog";
import { useAuth } from "@/features/auth/AuthContext";
import type { Quiz } from "@/features/practice/hooks/useQuiz";
import { Sidebar } from "@/features/practice/components/sidebar/Sidebar";
import { AnswerPendingBanner } from "./AnswerPendingBanner";
import { ImageViewer } from "./ImageViewer";
import { QuestionCard } from "./QuestionCard";
import type { QuestionViewProps } from "./types";

interface Props {
  quiz: Quiz;
  zoomOpen: boolean;
  onZoomChange: (open: boolean) => void;
}

// Màn hình làm bài: sidebar danh sách câu + khung câu hỏi + (tuỳ chọn) cửa sổ phóng to ảnh
export function QuizWorkspace({ quiz, zoomOpen, onZoomChange }: Props) {
  const { user } = useAuth();
  const [reportOpen, setReportOpen] = useState(false);
  const [reported, setReported] = useState<Set<number>>(new Set()); // các câu đã báo cáo trong phiên này
  const question = quiz.questions[quiz.current];
  if (!question) return null;

  // Báo cáo đáp án sai: chỉ với đề của hệ thống, đã đăng nhập, và khi câu này đã có kết quả (đáp án đã chắc chắn)
  const canReport = !!user && quiz.examId !== null && quiz.isRevealed(question) && !question.answerPending && question.correct.length > 0;

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
    reported: reported.has(question.number),
    onChoose: (option) => quiz.choose(question, option),
    onCheck: () => quiz.check(question),
    onPrev: quiz.prev,
    onNext: quiz.next,
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
      <Sidebar quiz={quiz} />
      <main className="flex flex-1 flex-col overflow-y-auto p-2 sm:p-3 lg:p-4">
        <AnswerPendingBanner source={quiz.answerSource} examId={quiz.examId} onRetry={quiz.waitForAnswers} />
        <QuestionCard key={question.number} {...view} onZoom={() => onZoomChange(true)} />
      </main>

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
