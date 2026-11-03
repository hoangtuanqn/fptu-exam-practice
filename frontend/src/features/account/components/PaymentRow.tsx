import { CopyButton } from "@/shared/ui/CopyButton";

// Một dòng thông tin chuyển khoản: nhãn bên trái, giá trị bên phải, có nút sao chép
export function PaymentRow({ label, value, copy, strong }: { label: string; value: string; copy?: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="flex items-center gap-1 text-right">
        <span className={`text-sm tabular-nums ${strong ? "font-semibold text-slate-900" : "text-slate-700"}`}>{value}</span>
        {copy && <CopyButton text={copy} label={`Sao chép ${label.toLowerCase()}`} />}
      </span>
    </div>
  );
}
