import { Award, BookOpenCheck, Clock, RotateCcw, Send } from "lucide-react";
import type { Mode } from "../../types";
import { getModeConfig } from "../../config/modes";
import { formatDuration } from "../../utils/format";
import { Button } from "../ui/Button";
import type { PickFolder } from "./FolderInput";
import { FolderPicker } from "./FolderPicker";

interface Props {
  title: string;
  mode: Mode;
  loaded: boolean; // đã có đề đang làm
  submitted: boolean;
  elapsed: number; // số giây đã làm bài
  onPick: PickFolder;
  onSubmit: () => void;
  onReset: () => void;
  onShowResult: () => void;
}

// Header tối giản. Chưa có đề: chỉ có tên app. Đang làm: tên đề | chế độ + đồng hồ | mở đề khác | nộp bài.
export function Header({ title, mode, loaded, submitted, elapsed, onPick, onSubmit, onReset, onShowResult }: Props) {
  const { Icon, label } = getModeConfig(mode);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-900 text-white">
          <BookOpenCheck size={16} />
        </div>
        <div className="truncate font-serif text-lg font-semibold text-slate-900">{loaded && title ? title : "Luyện đề"}</div>
      </div>

      {loaded && (
        <div className="flex shrink-0 items-center gap-2">
          {/* Chế độ + đồng hồ gộp một chip */}
          <span
            className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
              submitted ? "border-slate-200 bg-slate-50 text-slate-500" : "border-brand-200 bg-brand-50 text-brand-800"
            }`}
          >
            <Icon size={15} />
            <span className="hidden sm:inline">{label}</span>
            <span className="hidden h-4 w-px bg-current opacity-20 sm:block" />
            <Clock size={14} className="sm:hidden" />
            <span className="font-mono tabular-nums">{formatDuration(elapsed)}</span>
          </span>

          <FolderPicker iconOnly onPick={onPick} />

          {submitted ? (
            <>
              <Button onClick={onReset}>
                <RotateCcw size={16} />
                <span className="hidden sm:inline">Làm lại</span>
              </Button>
              <Button variant="primary" onClick={onShowResult}>
                <Award size={16} />
                Xem điểm
              </Button>
            </>
          ) : (
            <Button variant="primary" onClick={onSubmit}>
              <Send size={16} />
              Nộp bài
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
