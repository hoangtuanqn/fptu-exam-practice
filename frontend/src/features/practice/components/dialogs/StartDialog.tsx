import { useState } from "react";
import { FileText, Play } from "lucide-react";
import type { Mode } from "@/features/practice/types.ts";
import { MODES } from "@/features/practice/config/modes";
import { Button } from "@/shared/ui/Button";
import { Modal, ModalActions } from "@/shared/ui/Modal";

interface Props {
  title: string;
  total: number; // tổng số câu (ảnh)
  graded: number; // số câu có đáp án
  answersPending: boolean; // AI đang phân tích đáp án
  replacing: boolean; // đang có bài làm dở sẽ bị thay thế
  onCancel: () => void;
  onStart: (mode: Mode) => void;
}

// Hộp thoại sau khi upload đề: xác nhận + chọn chế độ (không đổi được giữa chừng)
export function StartDialog({ title, total, graded, answersPending, replacing, onCancel, onStart }: Props) {
  const [mode, setMode] = useState<Mode>("practice");

  return (
    <Modal onClose={onCancel}>
      <h2 className="font-serif text-xl font-semibold text-slate-900">Bắt đầu làm đề</h2>

      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        <div className="flex items-center gap-2 font-medium text-slate-900">
          <FileText size={15} className="shrink-0 text-slate-500" />
          <span className="truncate">{title || "Đề chưa đặt tên"}</span>
        </div>
        <div className="mt-1 text-slate-600">
          {total} câu hỏi{answersPending ? " · AI đang phân tích đáp án" : ` · ${graded} câu có đáp án`}
        </div>
      </div>

      {answersPending && (
        <p className="mt-3 text-sm text-brand-800">
          Bạn có thể làm bài ngay. Đáp án sẽ hiện khi AI phân tích xong, thường sau ít phút.
        </p>
      )}
      {!answersPending && graded < total && (
        <p className="mt-3 text-sm text-amber-700">
          Chỉ {graded}/{total} câu có đáp án trong ans.txt. Các câu còn lại sẽ không được chấm điểm.
        </p>
      )}
      {replacing && <p className="mt-3 text-sm text-rose-700">Bài đang làm dở sẽ bị thay thế bằng đề mới này.</p>}

      <div className="mt-5 text-xs font-medium uppercase tracking-wider text-slate-500">Chọn chế độ</div>
      <div className="mt-2 space-y-2">
        {MODES.map(({ value, label, desc, Icon }) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`flex w-full items-start gap-3 rounded-xl border-2 p-3 text-left transition ${
              mode === value ? "border-brand-900 bg-slate-50" : "border-slate-200 hover:border-slate-400"
            }`}
          >
            <Icon size={20} className="mt-0.5 shrink-0 text-slate-700" />
            <div className="flex-1">
              <div className="font-medium text-slate-900">{label}</div>
              <div className="text-sm text-slate-600">{desc}</div>
            </div>
            <span
              className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                mode === value ? "border-brand-900" : "border-slate-300"
              }`}
            >
              {mode === value && <span className="h-2 w-2 rounded-full bg-brand-900" />}
            </span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-500">Không đổi được chế độ khi đang làm bài.</p>

      <ModalActions>
        <Button grow onClick={onCancel}>
          Hủy
        </Button>
        <Button grow variant="primary" onClick={() => onStart(mode)}>
          <Play size={16} />
          <span className="sm:hidden">Bắt đầu</span>
          <span className="hidden sm:inline">Bắt đầu làm bài</span>
        </Button>
      </ModalActions>
    </Modal>
  );
}
