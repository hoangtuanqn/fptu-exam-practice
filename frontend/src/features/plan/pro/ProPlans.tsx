import { Check, Crown } from "lucide-react";
import { buttonClass } from "@/shared/ui/Button";
import { formatDate } from "@/shared/utils/formatters";
import type { PlanInfo } from "../plan.api";
import { DAYS_PER_MONTH, vnd } from "./money";

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

// Hai gói cạnh nhau. Pro đứng trước, có viền nổi và nhãn "Tiết kiệm nhất"; Nước rút là lựa chọn ngắn hạn, vẫn rõ ràng và dễ chọn.
export function ProPlans({ plan, label, newExpiry, onBuy }: Props) {
  const s = plan.sprint;
  const proPerDay = Math.round(plan.price / (plan.months * DAYS_PER_MONTH));
  const sprintPerDay = Math.round(s.price / s.days);

  return (
    <section id="goi" className="mx-auto max-w-3xl px-4 pt-10">
      <div className="grid gap-5 sm:grid-cols-[1.25fr_1fr]">
        <div className="relative flex flex-col rounded-m3-lg border-2 border-primary bg-surface-container-lowest p-5 shadow-m3-1 sm:p-6">
          <span className="md-label-medium absolute -top-3 left-5 rounded-full bg-primary px-3 py-0.5 text-on-primary">Tiết kiệm nhất</span>
          <h2 className="md-title-large text-on-surface">Pro {plan.months} tháng</h2>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
            <span className="text-4xl font-semibold tabular-nums text-on-surface">{vnd(plan.price)}</span>
            <span className="md-body-medium text-on-surface-variant">≈ {vnd(proPerDay)}/ngày</span>
          </p>
          <p className="md-body-medium mt-1 text-on-surface-variant">
            FuOverflow VIP cùng thời hạn: <s>{vnd(plan.fuoPrice)}</s>, bạn giữ lại <b className="text-primary">{vnd(plan.savings)}</b>
          </p>
          <ul className="mt-4 space-y-2">
            {PRO_POINTS.map((t) => (
              <li key={t} className="md-body-medium flex items-start gap-2 text-on-surface">
                <Check size={18} className="mt-0.5 shrink-0 text-primary" strokeWidth={2.6} /> {t}
              </li>
            ))}
          </ul>
          <button onClick={() => onBuy("pro")} className={buttonClass({ variant: "filled", className: "relative mt-5 !h-12 w-full text-base" })}>
            <Crown size={18} /> {label}
          </button>
          <p className="md-body-small mt-2 text-center text-on-surface-variant">Mua hôm nay: dùng Pro đến {formatDate(newExpiry.toISOString())}</p>
        </div>

        <div className="flex flex-col rounded-m3-lg border border-outline-variant bg-surface-container-low p-5 sm:p-6">
          <h2 className="md-title-large text-on-surface">Nước rút {s.days} ngày</h2>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-2">
            <span className="text-3xl font-semibold tabular-nums text-on-surface">{vnd(s.price)}</span>
            <span className="md-body-medium text-on-surface-variant">≈ {vnd(sprintPerDay)}/ngày</span>
          </p>
          <p className="md-body-medium mt-2 text-on-surface-variant">Đủ mọi quyền lợi Pro, cho đợt ôn gấp trước kỳ thi. Không cam kết lâu dài, không tự gia hạn.</p>
          <button onClick={() => onBuy("sprint")} className={buttonClass({ variant: "outlined", className: "relative mt-5 !h-12 w-full text-base sm:mt-auto" })}>
            Mua {s.days} ngày · {vnd(s.price)}
          </button>
        </div>
      </div>
      <p className="md-body-small mt-4 text-center text-on-surface-variant">Ôn lâu hơn {s.days} ngày thì Pro rẻ hơn mỗi ngày. Thiếu credit thì nạp thêm, xong quay lại mua ngay.</p>
    </section>
  );
}
