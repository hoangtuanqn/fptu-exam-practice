import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BookOpen,
  Clock,
  RotateCcw,
  Send,
  Trophy,
} from "lucide-react";
import type { Mode } from "@/features/practice/types.ts";
import { brand } from "@/shared/brand/brand";
import { getModeConfig } from "@/features/practice/config/modes";
import { formatDuration, formatScore } from "@/features/practice/utils/format";
import { Logo } from "@/shared/brand/Logo";
import { Button } from "@/shared/ui/Button";
import { UserMenu } from "@/shared/layout/UserMenu";
import { SiteNav } from "@/shared/layout/SiteNav";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";

interface Props {
  title: string;
  mode: Mode;
  loaded: boolean; // đã có đề đang làm
  submitted: boolean;
  submitLocked?: boolean; // AI chưa xong đáp án: chưa cho nộp
  elapsed: number; // số giây đã làm bài
  timeLimitSec?: number | null; // chế độ Thi có giới hạn: hiện thời gian còn lại thay cho thời gian đã làm
  bestScore?: number | null; // điểm cao nhất của người dùng ở đề này (chưa làm lần nào thì không hiện)
  timing: boolean; // đồng hồ đang chạy (không chạy khi chờ đáp án hoặc đã nộp)
  referenceCount?: number; // số tài liệu tham khảo của đề (trang công thức...); có thì hiện nút "Tài liệu"
  onShowReferences?: () => void;
  onHome: () => boolean; // bấm logo khi đang làm đề: trả về false nếu người dùng huỷ việc thoát
  onSubmit: () => void;
  onReset: () => void;
  onShowResult: () => void;
}

// Header tối giản. Chưa có đề: tên app + tài khoản. Đang làm: tên đề | chế độ + đồng hồ | mở đề khác | nộp bài | tài khoản.
export function Header({
  title,
  mode,
  loaded,
  submitted,
  submitLocked,
  elapsed,
  timeLimitSec,
  bestScore,
  timing,
  referenceCount = 0,
  onShowReferences,
  onHome,
  onSubmit,
  onReset,
  onShowResult,
}: Props) {
  const { Icon, label } = getModeConfig(mode);

  // Vừa bắt đầu tính giờ thì chip sáng lên một lúc để học viên nhận ra
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!timing) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 2500);
    return () => clearTimeout(t);
  }, [timing]);
  const waiting = !submitted && !!submitLocked; // chờ đáp án: giờ chưa chạy
  const left = timeLimitSec ? Math.max(0, timeLimitSec - elapsed) : null; // thời gian còn lại (chỉ khi thi có giới hạn)
  const low = left !== null && left <= 300; // còn dưới 5 phút: đổi sang màu đỏ

  return (
    <header className="z-30 flex h-16 shrink-0 items-center justify-between gap-2 border-b border-outline-variant bg-surface px-2 sm:px-4">
      <div className="flex shrink-0 items-center gap-3 sm:min-w-0 sm:shrink">
        <Link
          to="/"
          className="shrink-0"
          title={brand.company}
          onClick={(e) => {
            if (loaded && !onHome()) e.preventDefault();
          }}
        >
          {/* Đang làm bài trên điện thoại: chỉ mascot cho đỡ chật, để logo không bị chip đồng hồ và nút che mất */}
          {loaded ? (
            <>
              <Logo variant="mark" className="h-9 sm:hidden" />
              <Logo variant="full" className="hidden h-11 sm:block" />
            </>
          ) : (
            <Logo variant="full" className="h-10 sm:h-11" />
          )}
        </Link>
        <span className="hidden h-5 w-px shrink-0 bg-slate-200 sm:block" />
        <div className="hidden truncate text-base font-semibold tracking-tight text-slate-900 sm:block">
          {loaded && title ? title : brand.product}
        </div>
      </div>

      {/* Điều hướng chính, chỉ trên PC/tablet và khi chưa mở đề (đang làm bài thì nhường chỗ cho tên đề, đồng hồ).
          Điện thoại: các mục này nằm ở menu tài khoản và chân trang. */}
      {!loaded && (
        <SiteNav />
      )}

      <div className="flex min-w-0 items-center justify-end gap-1.5 sm:shrink-0 sm:gap-2">
        {loaded && (
          <>
            {bestScore != null && (
              <span
                title={`Điểm cao nhất của bạn ở đề này: ${formatScore(bestScore)}`}
                className="hidden items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-sm font-medium text-amber-800 sm:inline-flex sm:px-3"
              >
                <Trophy size={14} />
                <span className="hidden sm:inline">Cao nhất</span>
                <span className="tabular-nums">{formatScore(bestScore)}</span>
              </span>
            )}

            {/* Chế độ + đồng hồ gộp một chip */}
            <span
              title={
                waiting
                  ? "Giờ làm bài sẽ bắt đầu tính khi đề có đáp án"
                  : undefined
              }
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
              {waiting ? (
                <span className="whitespace-nowrap">
                  Chờ đáp án<span className="max-sm:hidden"> · chưa tính giờ</span>
                </span>
              ) : left !== null && !submitted ? (
                <span title="Thời gian còn lại" className={`whitespace-nowrap tabular-nums ${low ? "font-semibold text-rose-600" : ""}`}>
                  Còn {formatDuration(left)}
                </span>
              ) : (
                <span className="tabular-nums">{formatDuration(elapsed)}</span>
              )}
            </span>

            {referenceCount > 0 && onShowReferences && (
              <Button
                onClick={onShowReferences}
                title="Tài liệu tham khảo (không tính điểm)"
                aria-label="Tài liệu tham khảo"
                className="!px-2.5 sm:!px-4"
              >
                <BookOpen size={16} />
                <span className="hidden sm:inline">Tài liệu</span>
              </Button>
            )}

            {submitted ? (
              <>
                <Button onClick={onReset} className="!px-2.5 sm:!px-4" title="Làm lại" aria-label="Làm lại">
                  <RotateCcw size={16} />
                  <span className="hidden sm:inline">Làm lại</span>
                </Button>
                <Button
                  variant="primary"
                  onClick={onShowResult}
                  className="!px-3 sm:!px-4"
                >
                  <Award size={16} />
                  Xem điểm
                </Button>
              </>
            ) : (
              <Button
                variant="primary"
                onClick={onSubmit}
                disabled={submitLocked}
                className="!px-3 sm:!px-4"
              >
                <Send size={16} />
                Nộp bài
              </Button>
            )}
            <span className="mx-1 hidden h-6 w-px bg-slate-200 sm:block" />
          </>
        )}
        <ThemeToggle className={loaded ? "max-sm:hidden" : ""} />
        <UserMenu />
      </div>
    </header>
  );
}
