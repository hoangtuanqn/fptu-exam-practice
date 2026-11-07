import { Clock, Infinity as InfinityIcon, ShieldCheck, Sparkles } from "lucide-react";
import { useCountUp } from "@/shared/hooks/useCountUp";
import { Modal } from "@/shared/ui/Modal";
import { formatCredit } from "@/shared/utils/formatters";
import type { ExplanationBundle } from "./explanation.api";

interface Props {
  bundle: ExplanationBundle;
  unitPrice: number;
  freeTrials: number; // lượt xem thử miễn phí còn lại
  onBuy: () => void;
  onClose: () => void;
}

const nf = new Intl.NumberFormat("vi-VN");

// Popup mời mở khóa toàn bộ lời giải khi vừa vào làm đề (chỉ hiện khi chưa mua gói và còn câu chưa mua lẻ)
export function ExplainBundlePopup({ bundle, unitPrice, freeTrials, onBuy, onClose }: Props) {
  const shown = useCountUp(bundle.price, 900);
  const saved = bundle.original - bundle.price;

  return (
    <Modal onClose={onClose}>
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <Sparkles size={28} className="promo-wiggle" />
        </div>
        <h2 className="mt-3 font-serif text-2xl font-semibold text-slate-900">
          Mở khóa <span className="text-amber-600">toàn bộ lời giải AI</span>
        </h2>
        <p className="mt-1 text-sm text-slate-600">Trả một lần, xem giải thích {bundle.remaining} câu của đề này không mất thêm credit.</p>

        <div className="mt-4 rounded-2xl bg-inverse-surface px-4 py-4 text-inverse-on-surface">
          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="text-white/50 line-through">{nf.format(bundle.original)}</span>
            <span className="rounded-md bg-rose-500 px-1.5 py-0.5 text-xs font-bold">-{bundle.discountPercent}%</span>
          </div>
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="bg-gradient-to-b from-amber-200 to-amber-400 bg-clip-text text-5xl font-extrabold tabular-nums text-transparent">{nf.format(shown)}</span>
            <span className="text-sm font-medium text-amber-200">credit</span>
          </div>
          <div className="text-xs text-emerald-300">Tiết kiệm {nf.format(saved)} credit</div>
          {bundle.promoEndsAt && (
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-rose-200">
              <Clock size={12} /> Ưu đãi đến {new Date(bundle.promoEndsAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
            </div>
          )}
        </div>

        <ul className="mt-3 space-y-1 text-left text-xs text-slate-600">
          <li className="flex items-center gap-2"><InfinityIcon size={13} className="shrink-0 text-amber-600" /> Mua lẻ {formatCredit(unitPrice)}/câu{freeTrials > 0 ? `, bạn còn ${freeTrials} lượt xem thử miễn phí` : ""}</li>
          <li className="flex items-center gap-2"><ShieldCheck size={13} className="shrink-0 text-emerald-600" /> AI không tạo được lời giải thì bạn không mất credit</li>
        </ul>

        <div className="mt-5 flex flex-col gap-2">
          <button onClick={onBuy} className="rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-5 py-3 text-sm font-bold text-brand-900 shadow-[0_6px_20px_-4px_rgba(251,191,36,0.6)] transition active:scale-[0.98]">
            Mở khóa ngay · {formatCredit(bundle.price)}
          </button>
          <button onClick={onClose} className="py-1.5 text-sm text-slate-500 hover:text-slate-800">Để sau</button>
        </div>
      </div>
    </Modal>
  );
}
