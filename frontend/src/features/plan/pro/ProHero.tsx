import { BadgeCheck, CalendarClock, Check, Crown, ShieldCheck, Wallet } from "lucide-react";
import { logos } from "@/shared/brand/brand";
import { formatDate } from "@/shared/utils/formatters";
import type { PlanInfo } from "../plan.api";
import { vnd } from "./money";
import { DARK_GOLD, GOLD } from "./style";

interface Props {
  plan: PlanInfo;
  pro: boolean;
  daysLeft: number;
  expiresAt: string | null;
}

// Đầu trang nền vàng sẫm: lời hứa chính, mức tiết kiệm thật, linh vật. Chừa chỗ phía dưới để hai gói nổi chồng lên.
export function ProHero({ plan, pro, daysLeft, expiresAt }: Props) {
  return (
    <section className={`relative isolate overflow-hidden ${DARK_GOLD}`}>
      <div aria-hidden className="pro-glow absolute -right-24 -top-24 -z-10 h-96 w-96 rounded-full bg-[#ffc61f]/30 blur-3xl" />
      <div aria-hidden className="pro-glow absolute -bottom-32 -left-24 -z-10 h-80 w-80 rounded-full bg-[#ff8a3d]/20 blur-3xl [animation-delay:1.5s]" />
      <div aria-hidden className="absolute inset-0 -z-10 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:22px_22px]" />

      <div className="mx-auto grid max-w-5xl items-center gap-6 px-5 pb-28 pt-10 expanded:grid-cols-[1.2fr_0.8fr] expanded:pb-32 expanded:pt-16">
        <div className="pro-rise text-center expanded:text-left">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] ${GOLD}`}>
            <Crown size={13} strokeWidth={2.6} /> Gói Pro
          </span>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            Học thả ga,
            <br />
            <span className="bg-gradient-to-r from-[#ffe58a] via-[#ffc61f] to-[#ff9d2f] bg-clip-text text-transparent">không lo bị trừ credit</span>
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-[#fff6dc]/80 expanded:mx-0">
            Lấy đề, xem giải thích AI và tải đề PE <b className="text-white">không bị tính phí</b> trong suốt thời hạn Pro. Trả một lần, không tự gia hạn.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 expanded:justify-start">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#ffc61f]/50 bg-[#ffc61f]/15 px-3 py-1.5 text-sm font-bold text-[#ffe58a]">
              <BadgeCheck size={16} /> Rẻ hơn {vnd(plan.savings)} so với FuOverflow VIP
            </span>
          </div>

          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-[#fff6dc]/65 expanded:justify-start">
            <span className="inline-flex items-center gap-1"><ShieldCheck size={13} /> Trả một lần</span>
            <span className="inline-flex items-center gap-1"><Check size={13} /> Không tự gia hạn</span>
            <span className="inline-flex items-center gap-1"><Wallet size={13} /> Dùng credit trong ví</span>
          </p>

          {pro && (
            <p className="mx-auto mt-5 inline-flex max-w-md items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2.5 text-sm expanded:mx-0">
              <CalendarClock size={18} className="shrink-0 text-[#ffc61f]" />
              <span>
                Bạn đang là Pro, còn <b className="text-[#ffc61f]">{daysLeft} ngày</b>
                {expiresAt ? ` (đến ${formatDate(expiresAt)})` : ""}. Mua thêm sẽ được cộng dồn.
              </span>
            </p>
          )}
        </div>

        <div className="pro-rise relative mx-auto hidden w-full max-w-xs [animation-delay:150ms] expanded:block">
          <div aria-hidden className="pro-glow absolute inset-6 rounded-full bg-[#ffc61f]/40 blur-2xl" />
          <div className="pro-float relative">
            <img src={logos.mark} alt="" className="relative mx-auto w-52 drop-shadow-[0_18px_30px_rgba(0,0,0,0.5)]" draggable={false} />
            <Crown size={70} strokeWidth={1.6} className="absolute -top-8 left-1/2 -translate-x-1/2 -rotate-6 fill-[#ffc61f] text-[#ffe58a] drop-shadow-[0_6px_14px_rgba(255,198,31,0.6)]" />
          </div>
          <div className="absolute -left-3 top-16 rotate-[-6deg] rounded-xl bg-white px-3 py-1.5 text-sm font-extrabold text-[#3a2600] shadow-xl">-{vnd(plan.savings)}</div>
          <div className="absolute -right-2 bottom-12 rotate-[5deg] rounded-xl bg-[#ff4d4d] px-3 py-1.5 text-sm font-extrabold text-white shadow-xl">{plan.months} tháng</div>
        </div>
      </div>
    </section>
  );
}
