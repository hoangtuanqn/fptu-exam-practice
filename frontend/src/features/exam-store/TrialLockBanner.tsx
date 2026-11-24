import { Link } from "react-router-dom";
import { Loader2, Lock, Unlock } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { useUnlockExam } from "./useUnlockExam";

// Đề đang xem thử: chỉ vài câu đầu mở, các câu còn lại khoá cho tới khi mở khoá cả đề. Mở xong tải lại đề để có đủ câu.
export function TrialLockBanner({ examId, locked }: { examId: string; locked: number }) {
  const { start, busy, dialog } = useUnlockExam(examId, () => window.location.assign(`/exam/${examId}`));
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
