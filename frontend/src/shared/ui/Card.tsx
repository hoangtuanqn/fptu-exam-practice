import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-slate-200 bg-white ${className}`}>{children}</section>;
}

// Tiêu đề khối bên trong Card: tên + mô tả + nút hành động bên phải
export function CardHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3.5">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// Tiêu đề trang của panel: nhãn nhỏ (eyebrow) + tên trang + mô tả, kẻ một đường mảnh bên dưới
export function PageHeader({
  title,
  description,
  eyebrow,
  action,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-slate-200 pb-5">
      <div>
        {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// Lưới số liệu: các ô nằm chung một khung, ngăn cách bằng đường kẻ mảnh (không phải nhiều thẻ rời)
export function StatGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 ${className}`}>{children}</div>
  );
}

export type StatTone = "brand" | "emerald" | "amber" | "rose" | "slate";

const STAT_DOT: Record<StatTone, string> = {
  brand: "bg-brand-600",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  slate: "bg-slate-400",
};

// Ô số liệu: nhãn nhỏ có chấm màu, số lớn, ghi chú. Đặt trong StatGrid.
export function StatCard({
  label,
  value,
  note,
  tone = "brand",
}: {
  icon?: LucideIcon;
  label: string;
  value: ReactNode;
  note?: string;
  tone?: StatTone;
}) {
  return (
    <div className="bg-white p-5">
      <div className="eyebrow flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${STAT_DOT[tone]}`} />
        {label}
      </div>
      <div className="mt-3 text-[1.7rem] font-semibold leading-none tabular-nums text-slate-900">{value}</div>
      {note && <div className="mt-2 text-xs text-slate-500">{note}</div>}
    </div>
  );
}
