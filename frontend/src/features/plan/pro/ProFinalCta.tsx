import { Crown } from "lucide-react";
import { logos } from "@/shared/brand/brand";
import type { PlanInfo } from "../plan.api";
import { vnd } from "./money";
import { Reveal } from "./Reveal";
import { DARK_GOLD, GOLD_BUTTON } from "@/shared/ui/gold";

// Khối kêu gọi cuối trang: cùng nền vàng sẫm với phần đầu để trang có điểm đầu và điểm cuối cân nhau
export function ProFinalCta({ plan, label, onBuy }: { plan: PlanInfo; label: string; onBuy: () => void }) {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-20">
      <Reveal>
        <div className={`relative overflow-hidden rounded-m3-xl px-6 py-10 text-center ring-1 ring-[#ffc61f]/30 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_24px_60px_-20px_rgba(0,0,0,0.5)] ${DARK_GOLD}`}>
          <div aria-hidden className="pro-glow absolute -top-16 left-1/2 h-40 w-72 -translate-x-1/2 rounded-full bg-[#ffc61f]/30 blur-3xl" />
          <img src={logos.mark} alt="" className="pro-float relative mx-auto h-20 drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)]" draggable={false} />
          <h2 className="relative mt-3 text-2xl font-extrabold">Sẵn sàng học không giới hạn?</h2>
          <p className="relative mt-1.5 text-sm text-[#fff6dc]/75">
            {vnd(plan.price)} cho {plan.months} tháng, tiết kiệm {vnd(plan.savings)} so với FuOverflow VIP.
          </p>
          <button onClick={onBuy} className={`pro-cta md-label-large relative mt-5 inline-flex h-12 items-center gap-2 rounded-full px-8 font-extrabold ${GOLD_BUTTON}`}>
            <Crown size={18} /> {label}
          </button>
        </div>
      </Reveal>
    </section>
  );
}
