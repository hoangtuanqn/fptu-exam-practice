import { Sparkles } from "lucide-react";
import { formatCredit } from "@/shared/utils/formatters";
import type { ExplanationBundle } from "./explanation.api";

interface Props {
  trialsLeft: number; // lượt xem thử miễn phí còn lại
  unitPrice: number; // giá mua lẻ một câu
  bundle?: ExplanationBundle; // có thì mời mở khóa cả đề
  onExplain: () => void;
  onUnlock: () => void;
}

/**
 * Thanh mời hiện ngay khi người dùng làm SAI một câu: đây là lúc họ muốn biết lý do nhất.
 * Còn lượt thử thì mời xem miễn phí; hết lượt thì mời gói cả đề (rẻ hơn mua lẻ) hoặc mua riêng câu này.
 */
export function WrongAnswerNudge({ trialsLeft, unitPrice, bundle, onExplain, onUnlock }: Props) {
  const free = trialsLeft > 0;
  return (
    <div role="status" className="bundle-pill flex shrink-0 flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 via-surface-container-lowest to-amber-50 px-3 py-2 text-sm shadow-sm">
      <span className="flex min-w-0 items-center gap-2 text-amber-950">
        <Sparkles size={15} className="promo-twinkle shrink-0 text-amber-500" />
        {free ? (
          <span>
            Câu này bạn chưa đúng. <b>Xem AI giải thích miễn phí</b> <span className="text-amber-800">(còn {trialsLeft} lượt)</span>
          </span>
        ) : (
          <span>
            Sai câu này? <b>Xem vì sao</b> chỉ {formatCredit(unitPrice)}
            {bundle ? <span className="text-amber-800">, hoặc cả đề {formatCredit(bundle.price)} (-{bundle.discountPercent}%)</span> : null}
          </span>
        )}
      </span>
      <span className="flex shrink-0 items-center gap-2">
        {!free && bundle && (
          <button onClick={onUnlock} className="promo-shine rounded-lg bg-gradient-to-b from-amber-300 to-amber-500 px-3 py-1.5 text-xs font-bold text-brand-900 shadow-sm transition active:scale-[0.97]">
            Mở khóa cả đề
          </button>
        )}
        <button onClick={onExplain} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-[0.97] ${free ? "bg-primary text-on-primary hover:bg-primary/90" : "border border-brand-200 bg-surface-container-lowest text-brand-800 hover:border-brand-400"}`}>
          {free ? "Xem miễn phí" : "Chỉ câu này"}
        </button>
      </span>
    </div>
  );
}
