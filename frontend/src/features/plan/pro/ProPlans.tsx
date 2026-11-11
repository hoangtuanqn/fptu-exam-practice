import { Check, Crown, Sparkles } from "lucide-react";
import { useCountUp } from "@/shared/hooks/useCountUp";
import { buttonClass } from "@/shared/ui/Button";
import { formatDate } from "@/shared/utils/formatters";
import type { PlanInfo } from "../plan.api";
import { DAYS_PER_MONTH, vnd } from "./money";
import { GlossCard } from "@/shared/ui/GlossCard";
import { Reveal } from "./Reveal";
import { GOLD_BUTTON, GOLD_GLOSS } from "@/shared/ui/gold";

interface Props {
  plan: PlanInfo;
  label: string; // chữ nút mua Pro theo ngữ cảnh (khách, đã đăng nhập, đang là Pro)
  newExpiry: Date; // Pro sẽ đến ngày này nếu mua hôm nay
  onBuy: (kind: "pro" | "sprint") => void;
}

const PRO_POINTS = [
  "Lấy đề, giải thích AI, tải đề PE: không trừ credit",
  "Báo cáo điểm yếu theo chủ đề, luyện đúng phần yếu",
  "Xem đủ “Câu hay ra”, sổ câu sai không giới hạn",
  "Trả một lần, hết hạn thì dừng, không bị trừ thêm",
];

// Hai gói cạnh nhau, nổi chồng lên phần đầu trang. Pro đứng trước với khung vàng phát sáng và nhãn "Tiết kiệm nhất";
// Nước rút là lựa chọn ngắn hạn, vẫn rõ ràng và dễ chọn.
export function ProPlans({ plan, label, newExpiry, onBuy }: Props) {
  const s = plan.sprint;
  const price = useCountUp(plan.price, 1100);
  const proPerDay = Math.round(plan.price / (plan.months * DAYS_PER_MONTH));
  const sprintPerDay = Math.round(s.price / s.days);

  return (
    <section id="goi" className="relative z-10 mx-auto -mt-20 max-w-3xl px-4 expanded:-mt-24">
      <Reveal>
        <div className="grid gap-5 sm:grid-cols-[1.25fr_1fr]">
          {/* Khung vàng: viền chuyển màu 2px bao quanh thẻ Pro */}
          <div className="relative rounded-[calc(var(--radius-m3-lg,1.25rem)+2px)] bg-gradient-to-b from-[#ffd75e] via-[#ffc61f] to-[#f0a800] p-[2px] shadow-[0_24px_60px_-18px_rgba(255,198,31,0.55)]">
            <span className={`absolute -top-3 left-5 z-10 inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-xs font-extrabold ${GOLD_GLOSS}`}>
              <Sparkles size={12} strokeWidth={2.6} /> Tiết kiệm nhất
            </span>
            <div className="relative flex h-full flex-col rounded-m3-lg bg-gradient-to-b from-surface-container-lowest to-surface-container-low p-5 sm:p-6">
              <h2 className="md-title-large text-on-surface">Pro {plan.months} tháng</h2>
              <p className="mt-3 flex flex-wrap items-end gap-x-3 gap-y-1">
                <span className="text-5xl font-black leading-none tabular-nums tracking-tight text-on-surface">{vnd(price)}</span>
                <span className="mb-1 rounded-full bg-[#ff4d4d] px-2.5 py-1 text-xs font-extrabold text-white">-{plan.savingsPercent}%</span>
              </p>
              <p className="md-body-medium mt-2 text-on-surface-variant">
                ≈ {vnd(proPerDay)}/ngày · FuOverflow VIP cùng thời hạn: <s>{vnd(plan.fuoPrice)}</s>
              </p>
              <p className="md-label-large mt-1 text-primary">Bạn giữ lại {vnd(plan.savings)}</p>
              <ul className="mt-4 space-y-2.5">
                {PRO_POINTS.map((t) => (
                  <li key={t} className="md-body-medium flex items-start gap-2.5 text-on-surface">
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${GOLD_GLOSS}`}>
                      <Check size={13} strokeWidth={3.2} />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => onBuy("pro")}
                className={`pro-cta md-label-large mt-6 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full text-base font-extrabold transition-transform hover:scale-[1.02] active:scale-[0.98] ${GOLD_BUTTON}`}
              >
                <Crown size={20} strokeWidth={2.4} /> {label}
              </button>
              <p className="md-body-small mt-2 text-center text-on-surface-variant">Mua hôm nay: dùng Pro đến {formatDate(newExpiry.toISOString())}</p>
            </div>
          </div>

          <GlossCard lift className="flex flex-col p-5 sm:p-6">
            <h2 className="md-title-large text-on-surface">Nước rút {s.days} ngày</h2>
            <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
              <span className="text-3xl font-bold tabular-nums text-on-surface">{vnd(s.price)}</span>
              <span className="md-body-medium text-on-surface-variant">≈ {vnd(sprintPerDay)}/ngày</span>
            </p>
            <p className="md-body-medium mt-2 text-on-surface-variant">Đủ mọi quyền lợi Pro, cho đợt ôn gấp trước kỳ thi. Không cam kết lâu dài, không tự gia hạn.</p>
            <button onClick={() => onBuy("sprint")} className={buttonClass({ variant: "outlined", className: "relative mt-5 !h-12 w-full text-base sm:mt-auto" })}>
              Mua {s.days} ngày · {vnd(s.price)}
            </button>
          </GlossCard>
        </div>
        <p className="md-body-small mt-4 text-center text-on-surface-variant">Ôn lâu hơn {s.days} ngày thì Pro rẻ hơn mỗi ngày. Thiếu credit thì nạp thêm, xong quay lại mua ngay.</p>
      </Reveal>
    </section>
  );
}
