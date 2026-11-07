import { useEffect, useState } from "react";
import { Clock, Sparkles, X } from "lucide-react";
import { useCountUp } from "@/shared/hooks/useCountUp";
import { formatCredit } from "@/shared/utils/formatters";
import type { ExplanationBundle } from "./explanation.api";

interface Props {
  bundle: ExplanationBundle;
  unitPrice: number; // giá mua lẻ mỗi câu
  collapsed: boolean;
  onCollapse: () => void;
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

  // Điện thoại: chỉ một dải mỏng một dòng để không làm đề nhỏ đi. Máy tính: thẻ (nhỏ gọn) hoặc viên thuốc khi đã thu gọn
  const strip = (
    <button
      onClick={onUnlock}
      className="bundle-pill mb-1.5 flex w-full shrink-0 items-center justify-between gap-2 rounded-lg border border-amber-300 bg-gradient-to-r from-amber-50 to-surface-container-lowest px-2.5 py-1 text-left text-xs font-semibold text-amber-950 shadow-sm sm:hidden"
    >
      <span className="flex min-w-0 items-center gap-1.5">
        <Sparkles size={13} className="promo-twinkle shrink-0 text-amber-500" />
        <span className="truncate">Mở khóa mọi giải thích · {formatCredit(bundle.price)}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5">
        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">-{bundle.discountPercent}%</span>
        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-brand-900">Mua</span>
      </span>
    </button>
  );

  if (collapsed) {
    return (
      <>
      {strip}
      <button
        onClick={onUnlock}
        className="bundle-pill mb-2 hidden w-fit items-center sm:inline-flex gap-2 rounded-full border border-amber-300 bg-gradient-to-r from-amber-50 to-surface-container-lowest px-3.5 py-1.5 text-xs font-semibold text-amber-900 shadow-sm transition hover:border-amber-400 hover:shadow"
      >
        <Sparkles size={14} className="promo-twinkle text-amber-500" />
        Mở khóa mọi giải thích · {formatCredit(bundle.price)}
        <span className="rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">-{bundle.discountPercent}%</span>
        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-brand-900">Mua ngay</span>
      </button>
      </>
    );
  }

  return (
    <>
    {strip}
    <section
      aria-label="Mở khóa toàn bộ lời giải thích"
      className="bundle-card promo-shine relative mb-2 hidden shrink-0 overflow-hidden rounded-xl bg-inverse-surface px-4 py-3 text-inverse-on-surface shadow-m3-3 sm:block"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Quầng sáng vàng trôi nhẹ phía sau */}
      <span aria-hidden className="bundle-orb pointer-events-none absolute -right-10 -top-16 h-56 w-56 rounded-full bg-amber-400/25 blur-3xl" />
      <span aria-hidden className="bundle-orb pointer-events-none absolute -bottom-20 left-10 h-48 w-48 rounded-full bg-accent/20 blur-3xl [animation-delay:-3s]" />


      <button onClick={onCollapse} aria-label="Thu gọn" title="Thu gọn" className="absolute right-2 top-2 z-10 rounded-md p-1 text-white/50 transition hover:bg-surface-container-lowest/10 hover:text-white">
        <X size={14} />
      </button>

      <div className="relative flex items-center justify-between gap-4 pr-5">
        <div className="min-w-0">
          <h3 className="font-serif text-base font-semibold leading-snug">
            Mở khóa <span className="text-amber-300">toàn bộ lời giải AI</span>
          </h3>
          <p className="mt-0.5 text-xs text-white/70">
            Trả một lần, xem lại {bundle.questions} câu không mất thêm credit
            {bundle.buyers > 0 && <> · {nf.format(bundle.buyers)} bạn đã mở</>}
          </p>
          {bundle.promoEndsAt && <Countdown endsAt={bundle.promoEndsAt} />}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right leading-tight">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-xs text-white/50 line-through decoration-rose-300/80">{nf.format(bundle.original)}</span>
              <span className="rounded bg-rose-500 px-1 py-0.5 text-[10px] font-bold">-{bundle.discountPercent}%</span>
            </div>
            <div className="flex items-baseline justify-end gap-1">
              <span className="bg-gradient-to-b from-amber-200 to-amber-400 bg-clip-text text-xl font-extrabold tabular-nums text-transparent">{nf.format(shown)}</span>
              <span className="text-xs font-medium text-amber-200">credit</span>
            </div>
            <div className="text-[11px] text-emerald-300">Tiết kiệm {nf.format(saved)}</div>
          </div>
          <button
            onClick={onUnlock}
            className={`group relative z-10 inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 px-3.5 py-2 text-sm font-bold text-brand-900 shadow-[0_6px_20px_-4px_rgba(251,191,36,0.6)] transition active:scale-[0.97] ${hover ? "-translate-y-0.5" : ""}`}
          >
            <Sparkles size={15} /> Mở khóa
          </button>
        </div>
      </div>
    </section>
    </>
  );
}
