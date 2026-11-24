import { Link } from "react-router-dom";
import { Loader2, Lock, Unlock } from "lucide-react";
import { examApi } from "@/features/exam/exam.api";
import type { Question } from "@/features/practice/types";
import { Button } from "@/shared/ui/Button";
import { useUnlockExam } from "./useUnlockExam";

// Đề đang xem thử: chỉ vài câu đầu mở, các câu còn lại khoá cho tới khi mở khoá cả đề. Mở khoá xong thì các câu hiện ra ngay trong lượt đang làm.
export function TrialLockBanner({ examId, locked, onUnlocked }: { examId: string; locked: number; onUnlocked: (all: Question[], total: number) => void }) {
  // Mua xong thì nạp đủ câu vào đúng lượt đang làm, không mở lượt mới
  const { start, busy, dialog } = useUnlockExam(examId, async () => {
    const exam = await examApi.exam(examId);
    onUnlocked(exam.questions, exam.totalQuestions);
  });
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-m3-md border border-outline-variant bg-surface-container px-4 py-3">
      <Lock size={20} className="shrink-0 text-primary" aria-hidden />
      <p className="md-body-medium min-w-0 flex-1 text-on-surface">
        Bạn đang xem thử. <b>{locked} câu còn lại</b> đang khoá, bài làm thử không được lưu.{" "}
        <Link to="/pro" className="font-medium text-primary underline underline-offset-2">
          Hoặc nâng cấp Pro để mở mọi đề
        </Link>
      </p>
      <Button size="sm" variant="primary" disabled={busy} onClick={start}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Unlock size={15} />} Mở khoá cả đề
      </Button>
      {dialog}
    </div>
  );
}
