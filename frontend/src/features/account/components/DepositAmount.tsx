import { Gift } from "lucide-react";
import { formatCredit, formatMoney } from "@/shared/utils/formatters";

export interface BonusTier {
  min: number; // nạp từ mức này (VND) trở lên
  percent: number; // được thưởng thêm chừng này %
}

// Bậc thưởng cao nhất thỏa điều kiện (khớp với máy chủ)
export const tierOf = (amount: number, tiers: BonusTier[]) => [...tiers].sort((a, b) => b.min - a.min).find((t) => amount >= t.min) ?? null;
export const bonusOf = (amount: number, tiers: BonusTier[]) => {
  const tier = tierOf(amount, tiers);
  return tier ? Math.floor((amount * tier.percent) / 100) : 0;
};

// Gợi ý nhanh số tiền: bấm là điền. Mức có thưởng hiện thêm nhãn +%.
export function AmountPresets({ presets, value, tiers, onPick }: { presets: number[]; value: number; tiers: BonusTier[]; onPick: (amount: number) => void }) {
  return (
    <div role="group" aria-label="Gợi ý số tiền" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
      {presets.map((p) => {
        const tier = tierOf(p, tiers);
        const on = value === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            aria-pressed={on}
            className={`md-state md-motion flex flex-col items-center justify-center rounded-m3-md border px-2 py-2.5 ${
              on ? "border-primary bg-primary-container text-on-primary-container" : "border-outline-variant text-on-surface"
            }`}
          >
            <span className="md-title-small tabular-nums">{p.toLocaleString("vi-VN")}</span>
            <span className={`md-label-small h-4 ${tier ? "text-success" : ""}`}>{tier ? `+${tier.percent}%` : ""}</span>
          </button>
        );
      })}
    </div>
  );
}

// Một dòng gọn dưới ô nhập: tổng credit sẽ nhận, và còn thiếu bao nhiêu để lên mức thưởng kế tiếp. Bảng các mức chỉ mở khi cần.
export function BonusHint({ amount, tiers }: { amount: number; tiers: BonusTier[] }) {
  if (tiers.length === 0) return null;
  const sorted = [...tiers].sort((a, b) => a.min - b.min);
  const tier = tierOf(amount, tiers);
  const bonus = bonusOf(amount, tiers);
  const next = sorted.find((t) => t.min > amount);

  return (
    <div className="md-body-medium space-y-1.5 text-on-surface-variant" aria-live="polite">
      {amount > 0 && (
        <p className="text-on-surface">
          Bạn nhận <b className="tabular-nums">{formatCredit(amount + bonus)}</b>
          {tier && (
            <span className="ml-1.5 inline-flex items-center gap-1 text-success">
              <Gift size={14} /> gồm +{bonus.toLocaleString("vi-VN")} thưởng ({tier.percent}%)
            </span>
          )}
        </p>
      )}
      {next && (
        <p>{amount > 0 ? `Nạp thêm ${formatMoney(next.min - amount)} để được thưởng ${next.percent}%.` : `Nạp từ ${formatMoney(next.min)} được thưởng thêm ${next.percent}%.`}</p>
      )}
      {sorted.length > 1 && (
        <details>
          <summary className="md-label-large cursor-pointer text-primary">Xem các mức thưởng</summary>
          <ul className="mt-1.5 space-y-0.5">
            {sorted.map((t) => (
              <li key={t.min} className="tabular-nums">
                Từ {formatMoney(t.min)}: thưởng thêm {t.percent}%
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
