import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { CalendarCheck, Check, Coins, Flame, Gift, Loader2, X } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { MASCOT_SVG } from "@/shared/ui/mascot-art";
import type { CheckInResult, CheckInStatus } from "./check-in.api";

const fmt = (n: number) => n.toLocaleString("vi-VN");

// Số chạy từ 0 lên `target` (chỉ khi `run`), để khoảnh khắc nhận thưởng có cảm giác "được thêm"
function useCountUp(target: number, run: boolean, ms = 750) {
  const [value, setValue] = useState(run ? 0 : target);
  useEffect(() => {
    if (!run || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return setValue(target);
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setValue(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, run, ms]);
  return value;
}

const CONFETTI_COLORS = ["#0066ff", "#00c8ff", "#90e5ff", "#fbbf24", "#10b981", "#3399ff"];

// Pháo giấy bung ra từ mascot khi nhận thưởng (CSS thuần, tự tắt khi người dùng chọn giảm chuyển động)
function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const a = (i / 30) * Math.PI * 2 + (i % 3) * 0.17;
        const r = 80 + ((i * 37) % 70);
        return {
          dx: Math.cos(a) * r,
          dy: Math.sin(a) * r - 24,
          rot: ((i * 83) % 360) - 180,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
          delay: (i % 5) * 0.03,
        };
      }),
    [],
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0">
      {pieces.map((p, i) => (
        <span key={i} className="ci-confetti" style={{ "--dx": `${p.dx}px`, "--dy": `${p.dy}px`, "--rot": `${p.rot}deg`, background: p.color, animationDelay: `${p.delay}s` } as CSSProperties} />
      ))}
    </div>
  );
}

type NodeState = "done" | "today" | "future";

// Thanh tiến độ 7 chặng: chặng đã nhận = dấu tích xanh lá, hôm nay = vòng xanh sáng, chặng cuối = quà vàng
function Stepper({ status, completed, done }: { status: CheckInStatus; completed: number; done: boolean }) {
  const days = Array.from({ length: status.days }, (_, i) => i + 1);
  return (
    <ol className="mt-6 flex items-start">
      {days.map((d) => {
        const state: NodeState = d <= completed ? "done" : !done && d === status.cycleDay ? "today" : "future";
        const last = d === status.days;
        const node =
          state === "done"
            ? "bg-emerald-500 text-white"
            : state === "today"
              ? last
                ? "bg-gradient-to-br from-amber-300 to-amber-500 text-white ring-4 ring-amber-400/30"
                : "bg-gradient-to-br from-brand-600 to-accent text-white ring-4 ring-brand-500/25"
              : last
                ? "bg-amber-100 text-amber-500"
                : "bg-slate-100 text-slate-400";
        return (
          <li key={d} className="relative flex flex-1 flex-col items-center">
            {d > 1 && <span aria-hidden className={`absolute right-1/2 top-[17px] h-0.5 w-full -translate-y-1/2 rounded-full ${d <= completed ? "bg-emerald-400" : "bg-slate-200"}`} />}
            <span className={`relative z-10 flex h-[34px] w-[34px] items-center justify-center rounded-full text-xs font-bold transition ${node} ${state === "done" && d === completed && done ? "ci-pop" : ""}`}>
              {state === "done" ? <Check size={18} strokeWidth={3} /> : last ? <Gift size={17} /> : state === "today" ? <Coins size={16} /> : d}
            </span>
            <span className={`mt-1.5 text-[11px] font-semibold tabular-nums ${state === "done" ? "text-emerald-600" : last ? "text-amber-600" : state === "today" ? "text-brand-700" : "text-slate-400"}`}>
              +{fmt(last ? status.dailyAmount + status.bonus : status.dailyAmount)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

interface Props {
  status: CheckInStatus;
  result: CheckInResult | null;
  claiming: boolean;
  onClaim: () => void;
  onClose: () => void;
}

// Giao diện hộp điểm danh (thuần hiển thị, logic nằm ở DailyCheckInPopup): mascot lớn trên vầng sáng, số credit của hôm nay thật to,
// thanh tiến độ 7 chặng, một nút chính. Nhận xong: số chạy lên, mascot nảy, pháo giấy bung ra.
export function CheckInView({ status, result, claiming, onClaim, onClose }: Props) {
  const done = !!result || status.claimedToday;
  const completed = result ? result.completedDays : status.completedDays;
  const streak = result ? result.streak : status.streak;
  const amount = result ? result.amount : status.todayAmount;
  const shown = useCountUp(amount, !!result);
  const isBonusDay = status.cycleDay === status.days;

  return (
    <Modal onClose={onClose}>
      <div className="relative">
        <button type="button" onClick={onClose} aria-label="Đóng" className="absolute -right-1 -top-1 z-10 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
            <CalendarCheck size={14} /> Điểm danh hằng ngày
          </span>

          <div className="relative mt-4 flex h-40 w-40 items-center justify-center">
            <span aria-hidden className="absolute inset-0 rounded-full bg-gradient-to-b from-brand-100 via-brand-50 to-white" />
            <span aria-hidden className="absolute inset-4 rounded-full border border-brand-200/70" />
            <span aria-hidden className="absolute inset-0 rounded-full bg-accent/10 blur-2xl" />
            <div aria-hidden className={`relative w-32 drop-shadow-md [&>svg]:h-auto [&>svg]:w-full ${result ? "ci-bounce" : "ci-float"}`} dangerouslySetInnerHTML={{ __html: MASCOT_SVG }} />
            {result && <Confetti />}
          </div>

          <p className="mt-2 text-sm font-medium text-slate-500">{result ? "Đã nhận thành công" : status.claimedToday ? "Hôm nay bạn đã điểm danh" : `Ngày ${status.cycleDay} / ${status.days}`}</p>
          <div className="mt-1 flex items-baseline justify-center gap-2">
            <span className={`font-display text-6xl font-bold leading-none tracking-tight tabular-nums ${done ? "text-emerald-600" : isBonusDay ? "text-amber-600" : "text-brand-900"}`}>+{fmt(shown)}</span>
            <span className="text-lg font-semibold text-slate-500">credit</span>
          </div>

          {isBonusDay && (
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-sm font-medium text-amber-700">
              <Gift size={15} /> gồm {fmt(status.bonus)} credit thưởng đủ {status.days} ngày
            </p>
          )}
          {result && <p className="mt-1.5 text-sm text-slate-500">Số dư hiện tại: <b className="text-slate-800">{fmt(result.balanceAfter)} credit</b></p>}

          {streak > 0 && (
            <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              <Flame size={14} /> Chuỗi {streak} ngày liên tiếp
            </span>
          )}
        </div>

        <Stepper status={status} completed={completed} done={done} />

        <p className="mt-4 text-center text-xs leading-relaxed text-slate-500">
          {done ? "Qua ngày mới bạn có thể điểm danh tiếp." : <>Mỗi ngày +{fmt(status.dailyAmount)}. Đủ {status.days} ngày liên tiếp, ngày cuối nhận thêm +{fmt(status.bonus)}.</>}
        </p>

        <div className="mt-5">
          {done ? (
            <Button variant="primary" onClick={onClose} className="w-full">
              Đóng
            </Button>
          ) : (
            <>
              <Button variant="primary" onClick={onClaim} disabled={claiming} className="w-full !py-3 text-base">
                {claiming ? <Loader2 size={18} className="animate-spin" /> : <Gift size={18} />}
                Nhận {fmt(status.todayAmount)} credit
              </Button>
              <button type="button" onClick={onClose} disabled={claiming} className="mt-2.5 w-full text-center text-sm text-slate-400 transition hover:text-slate-600 disabled:opacity-50">
                Để sau
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
