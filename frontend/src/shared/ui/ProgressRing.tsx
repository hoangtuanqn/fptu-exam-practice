interface Props {
  value: number; // 0..1
  label: string; // chữ ở giữa vòng
  size?: number;
  color?: string; // màu cung tiến độ (class text-*)
}

// Vòng tròn tiến độ: cung màu chạy theo `value`, chữ ở giữa
export function ProgressRing({ value, label, size = 48, color = "text-brand-600" }: Props) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-200" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} className={`stroke-current ${color}`} />
      </svg>
      <span className="absolute text-[11px] font-bold tabular-nums text-slate-800">{label}</span>
    </span>
  );
}
