import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Clock, RotateCcw, Send } from "lucide-react";
import type { Mode } from "@/features/practice/types.ts";
import { brand } from "@/shared/brand/brand";
import { getModeConfig } from "@/features/practice/config/modes";
import { formatDuration } from "@/features/practice/utils/format";
import { Logo } from "@/shared/brand/Logo";
import { Button } from "@/shared/ui/Button";
import type { PickFolder } from "./FolderInput";
import { FolderPicker } from "./FolderPicker";
import { UserMenu } from "@/shared/layout/UserMenu";

interface Props {
  title: string;
  mode: Mode;
  loaded: boolean; // đã có đề đang làm
  submitted: boolean;
  submitLocked?: boolean; // AI chưa xong đáp án: chưa cho nộp
  elapsed: number; // số giây đã làm bài
  timing: boolean; // đồng hồ đang chạy (không chạy khi chờ AI phân tích đáp án hoặc đã nộp)
  onPick: PickFolder;
  onHome: () => boolean; // bấm logo khi đang làm đề: trả về false nếu người dùng huỷ việc thoát
  onSubmit: () => void;
  onReset: () => void;
  onShowResult: () => void;
}

// Header tối giản. Chưa có đề: tên app + tài khoản. Đang làm: tên đề | chế độ + đồng hồ | mở đề khác | nộp bài | tài khoản.
export function Header({ title, mode, loaded, submitted, submitLocked, elapsed, timing, onPick, onHome, onSubmit, onReset, onShowResult }: Props) {
  const { Icon, label } = getModeConfig(mode);

  // Vừa bắt đầu tính giờ thì chip sáng lên một lúc để học viên nhận ra
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!timing) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 2500);
    return () => clearTimeout(t);
  }, [timing]);
  const waiting = !submitted && !!submitLocked; // chờ AI: giờ chưa chạy

  return (
    <header className="glass z-30 flex h-14 shrink-0 items-center justify-between gap-3 border-b border-slate-200/70 px-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link
          to="/"
          className="shrink-0"
          title={brand.company}
          onClick={(e) => {
            if (loaded && !onHome()) e.preventDefault();
          }}
        >
          <Logo className="h-6 sm:h-7" />
        </Link>
        <span className="hidden h-5 w-px shrink-0 bg-slate-200 sm:block" />
        <div className="hidden truncate text-base font-semibold tracking-tight text-slate-900 sm:block">{loaded && title ? title : brand.product}</div>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        {loaded && (
          <>
            {/* Chế độ + đồng hồ gộp một chip */}
            <span
              title={waiting ? "Giờ làm bài sẽ bắt đầu tính khi AI phân tích xong đáp án" : undefined}
              className={`inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm transition sm:px-3 ${
                submitted
                  ? "border-slate-200 bg-slate-50 text-slate-500"
                  : waiting
                    ? "border-amber-200 bg-amber-50 text-amber-800"
                    : `border-brand-200 bg-brand-50 text-brand-800 ${flash ? "scale-105 shadow-card ring-2 ring-brand-400" : ""}`
              }`}
            >
              {timing && (
                <span className="relative flex h-2 w-2" aria-hidden>
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-600" />
                </span>
              )}
              <Icon size={15} className="hidden sm:block" />
              <span className="hidden sm:inline">{label}</span>
              <span className="hidden h-4 w-px bg-current opacity-20 sm:block" />
              <Clock size={14} className="sm:hidden" />
              {waiting ? <span className="whitespace-nowrap">Chờ AI · chưa tính giờ</span> : <span className="tabular-nums">{formatDuration(elapsed)}</span>}
            </span>

            <FolderPicker iconOnly onPick={onPick} />

            {submitted ? (
              <>
                <Button onClick={onReset} className="!px-2.5 sm:!px-4">
                  <RotateCcw size={16} />
                  <span className="hidden sm:inline">Làm lại</span>
                </Button>
                <Button variant="primary" onClick={onShowResult} className="!px-3 sm:!px-4">
                  <Award size={16} />
                  Xem điểm
                </Button>
              </>
            ) : (
              <Button variant="primary" onClick={onSubmit} disabled={submitLocked} className="!px-3 sm:!px-4">
                <Send size={16} />
                Nộp bài
              </Button>
            )}
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
          </>
        )}
        <UserMenu />
      </div>
    </header>
  );
}
