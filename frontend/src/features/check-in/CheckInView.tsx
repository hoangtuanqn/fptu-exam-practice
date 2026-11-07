import { Check, Coins, Flame, Gift, Loader2, Sparkles, X } from "lucide-react";
import { Button } from "@/shared/ui/Button";
import { Modal } from "@/shared/ui/Modal";
import { MASCOT_SVG } from "@/shared/ui/mascot-art";
import type { CheckInResult, CheckInStatus } from "./check-in.api";

const fmt = (n: number) => n.toLocaleString("vi-VN");

type TileState = "done" | "today" | "future";

// Ô của một ngày thường: nhãn ngày, biểu tượng tròn (đã nhận = dấu tích xanh, hôm nay = đồng xu xanh sáng, chưa tới = xám), số credit
function DayTile({ day, state, amount }: { day: number; state: TileState; amount: number }) {
  const box =
    state === "done"
      ? "border-emerald-200 bg-emerald-50"
      : state === "today"
        ? "border-brand-500 bg-white shadow-card ring-4 ring-brand-500/20"
        : "border-slate-200 bg-slate-50";
  const circle =
    state === "done" ? "bg-emerald-500 text-white" : state === "today" ? "bg-gradient-to-br from-brand-600 to-accent text-white" : "bg-slate-200 text-slate-400";
  return (
    <li className={`relative flex flex-col items-center rounded-2xl border px-1 pb-2.5 pt-2 text-center transition ${box}`}>
      <span className={`text-[10px] font-semibold uppercase tracking-wide ${state === "today" ? "text-brand-700" : "text-slate-500"}`}>{state === "today" ? "Hôm nay" : `Ngày ${day}`}</span>
      <span className={`my-1.5 flex h-9 w-9 items-center justify-center rounded-full ${circle}`}>{state === "done" ? <Check size={18} strokeWidth={3} /> : <Coins size={18} />}</span>
      <span className={`text-sm font-bold tabular-nums ${state === "done" ? "text-emerald-700" : state === "today" ? "text-brand-800" : "text-slate-400"}`}>+{fmt(amount)}</span>
    </li>
  );
}

// Ô ngày cuối vòng: rộng gấp đôi, màu vàng như quà, ghi rõ phần thưởng thêm
function BonusTile({ day, state, total, bonus }: { day: number; state: TileState; total: number; bonus: number }) {
  const box =
    state === "done"
      ? "border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100"
      : state === "today"
        ? "border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100 shadow-card ring-4 ring-amber-400/25"
        : "border-amber-200 bg-gradient-to-br from-amber-50/70 to-amber-100/60";
  return (
    <li className={`col-span-2 flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 ${box}`}>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${state === "done" ? "bg-emerald-500 text-white" : "bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow-soft"}`}>
        {state === "done" ? <Check size={24} strokeWidth={3} /> : <Gift size={24} />}
      </span>
      <span className="min-w-0 leading-tight">
        <span className={`block text-[10px] font-semibold uppercase tracking-wide ${state === "done" ? "text-emerald-700" : "text-amber-700"}`}>{state === "today" ? "Hôm nay · Quà chuỗi" : `Ngày ${day} · Quà chuỗi`}</span>
        <span className={`block text-xl font-bold tabular-nums ${state === "done" ? "text-emerald-700" : "text-amber-700"}`}>+{fmt(total)}</span>
        <span className="block text-[11px] text-slate-500">gồm {fmt(bonus)} thưởng đủ {day} ngày</span>
      </span>
    </li>
  );
}

interface Props {
  status: CheckInStatus;
  result: CheckInResult | null;
  claiming: boolean;
  onClaim: () => void;
  onClose: () => void;
}

// Giao diện hộp điểm danh (thuần hiển thị, logic nằm ở DailyCheckInPopup): đầu hộp gradient xanh thương hiệu có mascot Cóc Pass,
// lưới 7 ngày (6 ô thường + ô quà vàng cuối vòng), thẻ kết quả khi nhận xong.
export function CheckInView({ status, result, claiming, onClaim, onClose }: Props) {
  const done = !!result || status.claimedToday;
  const completed = result ? result.completedDays : status.completedDays;
  const streak = result ? result.streak : status.streak;
  const days = Array.from({ length: status.days }, (_, i) => i + 1);

  return (
    <Modal onClose={onClose}>
      {/* Đầu hộp: tràn sát mép (bù lề của Modal) */}
      <div className="relative -mx-5 -mt-5 mb-5 overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 px-5 pb-6 pt-6 text-white sm:-mx-7 sm:-mt-7 sm:px-7">
        <span aria-hidden className="pointer-events-none absolute -right-10 -top-12 h-48 w-48 rounded-full border border-white/10" />
        <span aria-hidden className="pointer-events-none absolute -right-2 -top-4 h-28 w-28 rounded-full border border-white/10" />
        <span aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 h-40 w-40 rounded-full bg-accent/10 blur-2xl" />
        <button type="button" onClick={onClose} aria-label="Đóng" className="absolute right-3 top-3 rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white">
          <X size={18} />
        </button>

        <div className="relative flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent-soft">Điểm danh hằng ngày</p>
            <h2 className="mt-1.5 font-display text-2xl font-semibold leading-tight sm:text-3xl">Nhận credit mỗi ngày</h2>
            <p className="mt-2 text-sm leading-relaxed text-brand-100">
              Mỗi ngày <b className="text-white">+{fmt(status.dailyAmount)}</b>. Đủ {status.days} ngày liên tiếp, thưởng thêm <b className="text-white">+{fmt(status.bonus)}</b>.
            </p>
            {streak > 0 && (
              <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur">
                <Flame size={14} className="text-amber-300" /> Chuỗi {streak} ngày liên tiếp
              </span>
            )}
          </div>
          <div aria-hidden className="w-28 shrink-0 drop-shadow-lg sm:w-32 [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: MASCOT_SVG }} />
        </div>
      </div>

      <ol className="grid grid-cols-4 gap-2.5">
        {days.map((d) => {
          const state: TileState = d <= completed ? "done" : !done && d === status.cycleDay ? "today" : "future";
          return d === status.days ? (
            <BonusTile key={d} day={d} state={state} total={status.dailyAmount + status.bonus} bonus={status.bonus} />
          ) : (
            <DayTile key={d} day={d} state={state} amount={status.dailyAmount} />
          );
        })}
      </ol>

      {result ? (
        <div className="mt-4 animate-fade-up rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100 px-4 py-4 text-center">
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800">
            <Sparkles size={16} /> Nhận thành công
          </div>
          <div className="mt-1 font-display text-4xl font-bold leading-none text-emerald-700">+{fmt(result.amount)} credit</div>
          {result.bonus > 0 && <div className="mt-1.5 text-xs text-emerald-800">gồm {fmt(result.bonus)} credit thưởng đủ {status.days} ngày liên tiếp</div>}
          <div className="mt-2 text-xs text-emerald-800/80">Số dư hiện tại: {fmt(result.balanceAfter)} credit</div>
        </div>
      ) : status.claimedToday ? (
        <p className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">Hôm nay bạn đã điểm danh rồi.</p>
      ) : null}

      {done && <p className="mt-3 text-center text-xs text-slate-500">Qua 0h (giờ Việt Nam) bạn có thể điểm danh tiếp.</p>}

      <div className="mt-5 flex gap-3">
        {done ? (
          <Button grow variant="primary" onClick={onClose}>
            Đóng
          </Button>
        ) : (
          <>
            <Button grow onClick={onClose} disabled={claiming}>
              Để sau
            </Button>
            <Button grow variant="primary" onClick={onClaim} disabled={claiming}>
              {claiming ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
              Nhận {fmt(status.todayAmount)} credit
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
