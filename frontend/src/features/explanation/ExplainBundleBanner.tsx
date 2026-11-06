import { useEffect, useState } from "react";
import { Clock, Infinity as InfinityIcon, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useCountUp } from "@/shared/hooks/useCountUp";
import { formatCredit } from "@/shared/utils/formatters";
import type { ExplanationBundle } from "./explanation.api";

interface Props {
  bundle: ExplanationBundle;
  unitPrice: number; // giá mua lẻ mỗi câu
  collapsed: boolean;
  onCollapse: () => void;
  onExpand: () => void;
  onUnlock: () => void;
}

const nf = new Intl.NumberFormat("vi-VN");

// Đồng hồ đếm ngược tới hạn chót THẬT của ưu đãi (chỉ có khi máy chủ báo promoEndsAt)
function Countdown({ endsAt }: { endsAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, new Date(endsAt).getTime() - now);
  const d = Math.floor(left / 86_400_000);
  const hms = [Math.floor(left / 3_600_000) % 24, Math.floor(left / 60_000) % 60, Math.floor(left / 1000) % 60].map((n) => String(n).padStart(2, "0")).join(":");
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-200">
      <Clock size={12} /> Ưu đãi còn {d > 0 ? `${d} ngày ` : ""}
      <span className="tabular-nums">{hms}</span>
    </span>
  );
}

/**
 * Lời mời "Mở khóa toàn bộ lời giải thích" hiện ngay khi vào làm đề: thẻ lớn có hiệu ứng khi mới vào,
 * bấm × (hoặc sang câu khác) thì thu thành một viên thuốc nhỏ để không choán chỗ làm bài.
 * Hiệu ứng chỉ dùng transform/opacity và tự tắt với người bật "giảm chuyển động".
 */
export function ExplainBundleBanner({ bundle, unitPrice, collapsed, onCollapse, onUnlock }: Props) {
  const shown = useCountUp(bundle.price, 1100);
  const saved = bundle.original - bundle.price;
  const [hover, setHover] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={onUnlock}
        className="bundle-pill mb-2 inline-flex w-fit items-center gap-2 rounded-full border border-amber-300 bg-gradient-to-r from-amber-50 to-white px-3.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm transition hover:border-amber-400 hover:shadow"
      >
        <Sparkles size={14} className="promo-twinkle text-amber-500" />
        Mở khóa mọi giải thích · {formatCredit(bundle.price)}
        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">-{bundle.discountPercent}%</span>
        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-brand-900">Mua ngay</span>
      </button>
    );
  }

  return (
    <section
      aria-label="Mở khóa toàn bộ lời giải thích"
      className="bundle-card promo-shine relative mb-3 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-brand-900 via-[#10265a] to-brand-800 p-5 text-white shadow-lg"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Quầng sáng vàng trôi nhẹ phía sau */}
      <span aria-hidden className="bundle-orb pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-amber-400/25 blur-3xl" />
      <span aria-hidden className="bundle-orb pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-accent/20 blur-3xl [animation-delay:-3s]" />
      {/* Vài ngôi sao lấp lánh */}
      <Sparkles aria-hidden size={14} className="promo-twinkle absolute right-16 top-4 text-amber-300" />
      <Sparkles aria-hidden size={10} className="promo-twinkle absolute right-1/3 top-3 text-white/70 [animation-delay:-1s]" />
      <Sparkles aria-hidden size={12} className="promo-twinkle absolute bottom-4 left-1/2 text-amber-200/80 [animation-delay:-1.7s]" />


      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300 ring-1 ring-amber-300/30">
            <Sparkles size={12} className="promo-wiggle" /> Gói phổ biến · ưu đãi cho đề này
          </div>
          <h3 className="mt-2 font-serif text-xl font-semibold leading-snug sm:text-2xl">
            Mở khóa <span className="text-amber-300">toàn bộ lời giải AI</span>
          </h3>
          <ul className="mt-2 space-y-1 text-sm text-white/80">
            <li className="flex items-center gap-2">
              <InfinityIcon size={14} className="shrink-0 text-amber-300" /> Trả một lần, xem lại {bundle.questions} câu không mất thêm credit
            </li>
            <li className="text-white/60">Mua lẻ: {formatCredit(unitPrice)} mỗi câu. Gói này rẻ hơn {bundle.discountPercent}%.</li>
            <li className="flex items-center gap-2 text-white/70">
              <ShieldCheck size={14} className="shrink-0 text-emerald-300" /> AI không tạo được lời giải thì bạn không mất credit
            </li>
          </ul>
          {bundle.buyers > 0 && (
            <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/85">
              <Users size={12} className="text-amber-300" /> {nf.format(bundle.buyers)} bạn đã mở khóa đề này
            </div>
          )}
          <button onClick={onCollapse} className="mt-3 block text-xs text-white/50 underline-offset-2 hover:text-white hover:underline">
            Thu gọn
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-4 sm:flex-col sm:items-end sm:gap-2">
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <span className="text-sm text-white/50 line-through decoration-rose-300/80">{nf.format(bundle.original)}</span>
              <span className="promo-wiggle inline-block rounded-md bg-rose-500 px-1.5 py-0.5 text-xs font-bold">-{bundle.discountPercent}%</span>
            </div>
            <div className="flex items-baseline justify-end gap-1.5">
              <span className="bg-gradient-to-b from-amber-200 to-amber-400 bg-clip-text text-4xl font-extrabold tabular-nums text-transparent sm:text-5xl">{nf.format(shown)}</span>
              <span className="text-sm font-medium text-amber-200">credit</span>
            </div>
            <div className="text-xs text-emerald-300">Tiết kiệm {nf.format(saved)} credit</div>
            {bundle.promoEndsAt && <Countdown endsAt={bundle.promoEndsAt} />}
          </div>

          <button
            onClick={onUnlock}
            className={`group relative z-10 inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-5 py-2.5 text-sm font-bold text-brand-900 shadow-[0_6px_20px_-4px_rgba(251,191,36,0.6)] transition active:scale-[0.97] ${hover ? "-translate-y-0.5" : ""}`}
          >
            <Sparkles size={16} /> Mở khóa ngay
          </button>
        </div>
      </div>
    </section>
  );
}
