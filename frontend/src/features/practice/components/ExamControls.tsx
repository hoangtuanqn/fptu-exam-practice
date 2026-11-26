// Màn làm đề không có thanh đầu trang (dành chỗ cho đề): nút thoát và cụm nộp bài, đồng hồ, tài liệu đặt cạnh câu hỏi.
// Điện thoại và máy tính bảng cầm dọc: cùng hàng với nút "Câu 5/40". Máy tính: hàng đầu khung câu hỏi. Điện thoại ngang: cột bên phải.
import { Link } from "react-router-dom";
import { Award, BookOpen, RotateCcw, Send, X } from "lucide-react";
import type { Mode } from "@/features/practice/types.ts";
import { getModeConfig } from "@/features/practice/config/modes";
import { Button } from "@/shared/ui/Button";
import { ExamTimer } from "./ExamTimer";

export interface ExamFocus {
  mode: Mode;
  submitted: boolean;
  submitLocked: boolean; // AI chưa xong đáp án: chưa cho nộp
  trial: boolean; // đề đang xem thử (chưa mở khoá): không có nộp bài
  elapsed: number; // số giây đã làm bài
  timeLimitSec: number | null;
  referenceCount: number;
  onShowReferences: () => void;
  onHelp: () => void;
  onHome: () => boolean; // trả về false nếu người dùng huỷ việc thoát
  onSubmit: () => void;
  onReset: () => void;
  onShowResult: () => void;
}

export function ExitButton({ onHome }: Pick<ExamFocus, "onHome">) {
  return (
    <Link
      to="/"
      aria-label="Thoát bài làm"
      title="Thoát bài làm"
      className="panel-q-tool shrink-0"
      onClick={(e) => {
        if (!onHome()) e.preventDefault();
      }}
    >
      <X size={18} />
    </Link>
  );
}

// Chữ trên nút ẩn khi xoay ngang (chỉ còn biểu tượng cho cột hẹp); tên đọc cho trình đọc màn hình nằm ở aria-label
export function ExamActions({ focus }: { focus: ExamFocus }) {
  const { mode, submitted, submitLocked, trial, elapsed, timeLimitSec, referenceCount } = focus;
  const isExam = mode === "exam";
  const waiting = !submitted && submitLocked; // chờ đáp án: giờ chưa chạy
  const left = timeLimitSec ? Math.max(0, timeLimitSec - elapsed) : null;
  const showLeft = isExam && left !== null && !submitted && !waiting;
  const { Icon, label } = getModeConfig(mode);

  return (
    <div className="flex shrink-0 items-center gap-1.5 land:flex-col land:gap-1">
      {referenceCount > 0 && (
        <button type="button" onClick={focus.onShowReferences} aria-label={`Tài liệu tham khảo, ${referenceCount} mục`} title="Tài liệu tham khảo (không tính điểm)" className="panel-q-tool land:hidden">
          <BookOpen size={18} />
        </button>
      )}
      {showLeft ? (
        <ExamTimer compact left={left} limit={timeLimitSec!} />
      ) : (
        (waiting || (isExam && !submitted)) && (
          <span title={waiting ? "Chờ đáp án, giờ làm bài chưa tính" : label} className="md-label-small inline-flex items-center gap-1 text-on-surface-variant">
            <Icon size={14} aria-hidden />
            <span className="land:sr-only">{waiting ? "Chờ đáp án" : label}</span>
          </span>
        )
      )}
      {submitted ? (
        <>
          <Button size="sm" onClick={focus.onReset} aria-label="Làm lại" title="Làm lại" className="!px-2.5">
            <RotateCcw size={16} />
          </Button>
          <Button size="sm" variant="primary" onClick={focus.onShowResult} aria-label="Xem điểm" className="!px-3 land:!px-2.5">
            <Award size={16} />
            <span className="land:hidden">Xem điểm</span>
          </Button>
        </>
      ) : (
        <Button size="sm" variant="primary" onClick={focus.onSubmit} disabled={submitLocked} aria-label="Nộp bài" title={trial ? "Mở khoá đề để nộp bài" : "Nộp bài"} className="!px-3 land:!px-2.5">
          <Send size={16} />
          <span className="max-[379px]:hidden land:hidden">Nộp bài</span>
        </Button>
      )}
    </div>
  );
}
