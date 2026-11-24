import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BookOpen,
  CircleHelp,
  RotateCcw,
  Send,
} from "lucide-react";
import type { Mode } from "@/features/practice/types.ts";
import { brand } from "@/shared/brand/brand";
import { getModeConfig } from "@/features/practice/config/modes";
import { ExamTimer } from "./ExamTimer";
import { Logo } from "@/shared/brand/Logo";
import { Button, buttonClass } from "@/shared/ui/Button";
import { UserMenu } from "@/shared/layout/UserMenu";
import { SiteNav } from "@/shared/layout/SiteNav";
import { ThemeToggle } from "@/shared/theme/ThemeToggle";
import { SearchTrigger } from "@/features/search/GlobalSearch";
import { UserNoticeBell } from "@/features/notifications/UserNoticeBell"; // component công khai của feature thông báo

// Nút "Hướng dẫn": chưa từng mở thì có chấm nhấp nháy gợi ý bấm vào (mở một lần là thôi)
const HELP_SEEN_KEY = "practice_help_seen";
const helpSeen = () => {
  try {
    return localStorage.getItem(HELP_SEEN_KEY) === "1";
  } catch {
    return true; // không đọc được thì khỏi nhắc
  }
};

interface Props {
  title: string;
  mode: Mode;
  loaded: boolean; // đã có đề đang làm
  submitted: boolean;
  submitLocked?: boolean; // AI chưa xong đáp án: chưa cho nộp
  trial?: boolean; // đề đang xem thử (chưa mở khoá): không có nộp bài
  elapsed: number; // số giây đã làm bài
  timeLimitSec?: number | null; // chế độ Thi có giới hạn: hiện thời gian còn lại thay cho thời gian đã làm
  timing: boolean; // đồng hồ đang chạy (không chạy khi chờ đáp án hoặc đã nộp)
  referenceCount?: number; // số tài liệu tham khảo của đề (trang công thức...); có thì hiện nút "Tài liệu"
  onShowReferences?: () => void;
  onHelp?: () => void; // nút "?" mở bảng hướng dẫn làm bài
  onHome: () => boolean; // bấm logo khi đang làm đề: trả về false nếu người dùng huỷ việc thoát
  onSubmit: () => void;
  onReset: () => void;
  onShowResult: () => void;
  reviewBackTo?: string; // xem lại bài đã nộp: chỉ còn một nút quay về kết quả
}

// Header tối giản. Chưa có đề: tên app + tài khoản. Đang làm: tên đề | chế độ + đồng hồ | mở đề khác | nộp bài | tài khoản.
export function Header({
  title,
  mode,
  loaded,
  submitted,
  submitLocked,
  trial,
  elapsed,
  timeLimitSec,
  timing,
  referenceCount = 0,
  onShowReferences,
  onHelp,
  onHome,
  onSubmit,
  onReset,
  onShowResult,
  reviewBackTo,
}: Props) {
  const { Icon, label } = getModeConfig(mode);
  const [seenHelp, setSeenHelp] = useState(helpSeen);
  const openHelp = () => {
    setSeenHelp(true);
    try {
      localStorage.setItem(HELP_SEEN_KEY, "1");
    } catch {
      /* không lưu được thì thôi */
    }
    onHelp?.();
  };

  // Luyện tập không hiện thời gian; chỉ chế độ Thi mới có đồng hồ (thanh còn lại khi có giới hạn)
  const isExam = mode === "exam";
  // Vừa bắt đầu tính giờ thì chip sáng lên một lúc để học viên nhận ra
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    if (!timing || !isExam) return;
    setFlash(true);
    const t = setTimeout(() => setFlash(false), 2500);
    return () => clearTimeout(t);
  }, [timing, isExam]);
  const waiting = !submitted && !!submitLocked; // chờ đáp án: giờ chưa chạy
  const left = timeLimitSec ? Math.max(0, timeLimitSec - elapsed) : null; // thời gian còn lại (chỉ khi thi có giới hạn)
  const showLeft = isExam && left !== null && !submitted && !waiting;
  // Đồng hồ chiếm nhiều chỗ: cụm tài khoản chờ tới xl mới hiện, còn lại tới lg
  const accountHidden = showLeft ? "max-xl:hidden" : "max-lg:hidden";

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
              <Logo variant="mark" className="h-9 lg:hidden" />
              <Logo variant="full" className="hidden h-11 lg:block" />
            </>
          ) : (
            <Logo variant="full" className="h-10 sm:h-11" />
          )}
        </Link>
        <span className={`hidden h-5 w-px shrink-0 bg-slate-200 ${loaded ? "md:block" : "sm:block"}`} />
        <div className={`hidden truncate text-base font-semibold tracking-tight text-slate-900 ${loaded ? "md:block" : "sm:block"}`}>
          {loaded && title ? title : brand.product}
        </div>
      </div>

      {/* Điều hướng chính, chỉ trên PC/tablet và khi chưa mở đề (đang làm bài thì nhường chỗ cho tên đề, đồng hồ).
          Điện thoại: các mục này nằm ở menu tài khoản và chân trang. */}
      {!loaded && (
        <SiteNav />
      )}

      <div className="flex min-w-0 items-center justify-end gap-1 sm:shrink-0 sm:gap-2">
        {loaded && (
          <>
            {/* Tài liệu tham khảo: đứng đầu cụm nút bên phải, luôn có chữ (không chỉ biểu tượng) vì người làm bài cần tới nó thường xuyên */}
            {referenceCount > 0 && onShowReferences && (
              <Button
                variant="tonal"
                onClick={onShowReferences}
                title="Tài liệu tham khảo (không tính điểm)"
                aria-label={`Tài liệu tham khảo, ${referenceCount} mục`}
                className="!px-3 sm:!px-4"
              >
                <BookOpen size={16} />
                <span className="max-sm:hidden">Tài liệu</span>
                <span className="md-label-small rounded-full bg-primary px-1.5 tabular-nums text-on-primary max-[359px]:hidden">{referenceCount}</span>
              </Button>
            )}

            {/* Chế độ (chip) và đồng hồ đếm ngược: chỉ hiện khi Thi hoặc đang chờ đáp án. Luyện tập thì không cần nhắc người dùng đang ở chế độ nào */}
            {(isExam || waiting) && (
              <span
                title={waiting ? "Giờ làm bài sẽ bắt đầu tính khi đề có đáp án" : undefined}
                className={`inline-flex min-w-0 items-center gap-2 rounded-xl border px-2.5 py-1.5 text-sm transition sm:px-3 ${showLeft ? "max-xl:hidden" : ""} ${
                  submitted
                    ? "border-slate-200 bg-slate-50 text-slate-500"
                    : waiting
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : `border-brand-200 bg-brand-50 text-brand-800 ${flash ? "scale-105 shadow-card ring-2 ring-brand-400" : ""}`
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="hidden sm:inline">{label}</span>
                {waiting && (
                  <>
                    <span className="hidden h-4 w-px bg-current opacity-20 sm:block" />
                    <span className="truncate">
                      Chờ đáp án{isExam && <span className="max-sm:hidden"> · chưa tính giờ</span>}
                    </span>
                  </>
                )}
              </span>
            )}
            {showLeft && timeLimitSec && <ExamTimer left={left!} limit={timeLimitSec} />}

            {onHelp && !reviewBackTo && (
              <Button variant="tonal" onClick={openHelp} title="Hướng dẫn làm bài: cách chọn đáp án và phím tắt" aria-label="Hướng dẫn làm bài" className="relative !px-2.5">
                {!seenHelp && (
                  <span aria-hidden className="absolute -right-1 -top-1 flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
                  </span>
                )}
                <CircleHelp size={18} />
              </Button>
            )}

            {reviewBackTo ? (
              <Link to={reviewBackTo} className={buttonClass({ variant: "primary", className: "!px-3 sm:!px-4" })}>
                <Award size={16} />
                Về kết quả
              </Link>
            ) : submitted ? (
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
                disabled={submitLocked || trial}
                title={trial ? "Mở khoá đề để nộp bài" : undefined}
                className="!px-3 sm:!px-4"
              >
                <Send size={16} />
                Nộp bài
              </Button>
            )}
            <span className={`mx-1 hidden h-6 w-px bg-slate-200 ${showLeft ? "xl:block" : "lg:block"}`} />
          </>
        )}
        {/* Đang làm bài: ẩn thông báo, giao diện khi thanh chưa đủ rộng để cụm nút không tràn đè lên đồng hồ */}
        {!loaded && <SearchTrigger />}
        <span className={loaded ? `contents ${accountHidden}` : "contents"}>
          <UserNoticeBell />
        </span>
        <ThemeToggle className={loaded ? accountHidden : ""} />
        <UserMenu /> {/* luôn hiện: dưới lg chỉ còn ảnh đại diện, menu có đổi giao diện và số dư */}
      </div>
    </header>
  );
}
