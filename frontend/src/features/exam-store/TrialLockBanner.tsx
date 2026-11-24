import { Loader2, Lock, Unlock } from "lucide-react";
import { examApi } from "@/features/exam/exam.api";
import type { Question } from "@/features/practice/types";
import { Button } from "@/shared/ui/Button";
import { useToast } from "@/shared/context/ToastContext";
import { useUnlockExam } from "./useUnlockExam";

// Mua xong thì nạp đủ câu vào đúng lượt đang làm, không mở lượt mới
export function useTrialUnlock(examId: string, onUnlocked: (all: Question[], total: number) => void) {
  const toast = useToast();
  return useUnlockExam(examId, async () => {
    const exam = await examApi.exam(examId);
    onUnlocked(exam.questions, exam.totalQuestions);
    toast.success("Đã mở khoá đề, bạn làm tiếp được rồi");
  });
}

// Đề đang xem thử: chỉ vài câu đầu mở, các câu còn lại khoá cho tới khi mở khoá cả đề. Mở khoá xong thì các câu hiện ra ngay trong lượt đang làm.
export function TrialLockBanner({ examId, shown, total, onUnlocked }: { examId: string; shown: number; total: number; onUnlocked: (all: Question[], total: number) => void }) {
  const { start, busy, dialog } = useTrialUnlock(examId, onUnlocked);
  return (
    <div className="mb-3 flex items-center gap-2 rounded-m3-md border border-outline-variant bg-surface-container px-3 py-1.5">
      <Lock size={16} className="shrink-0 text-primary" aria-hidden />
      <p className="md-body-small min-w-0 flex-1 text-on-surface-variant">
        Xem thử miễn phí · {shown}/{total} câu. Bài làm thử không được lưu.
      </p>
      <Button size="sm" variant="text" disabled={busy} onClick={start}>
        {busy ? <Loader2 size={14} className="animate-spin" /> : <Unlock size={14} />} Mở khoá
      </Button>
      {dialog}
    </div>
  );
}
