import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Thẻ Material Design 3. Biến thể: outlined (mặc định: viền outline-variant), filled (nền surface-container-highest), elevated (nền theo tông + bóng nhẹ).
export type CardVariant = "outlined" | "filled" | "elevated";
const CARD: Record<CardVariant, string> = {
  outlined: "border border-outline-variant bg-surface text-on-surface",
  filled: "bg-surface-container-highest text-on-surface",
  elevated: "bg-surface-container-low text-on-surface shadow-m3-1",
};

export function Card({ children, className = "", variant = "outlined" }: { children: ReactNode; className?: string; variant?: CardVariant }) {
  return <section className={`rounded-m3-md ${CARD[variant]} ${className}`}>{children}</section>;
}

// Tiêu đề khối bên trong Card: tên + mô tả + nút hành động bên phải
export function CardHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant px-5 py-4">
      <div>
        <h2 className="md-title-medium text-on-surface">{title}</h2>
        {description && <p className="md-body-medium mt-0.5 text-on-surface-variant">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// Tiêu đề trang của panel: nhãn nhỏ (eyebrow) + tên trang + mô tả
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
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 pb-4">
      <div>
        {eyebrow && <p className="md-label-medium mb-1 uppercase tracking-wider text-primary">{eyebrow}</p>}
        <h1 className="md-headline-small text-on-surface">{title}</h1>
        {description && <p className="md-body-medium mt-1 text-on-surface-variant">{description}</p>}
      </div>
      {action}
    </div>
  );
}

// Lưới số liệu: các ô nằm chung một khung, ngăn cách bằng đường kẻ mảnh
export function StatGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`grid gap-px overflow-hidden rounded-m3-md border border-outline-variant bg-outline-variant ${className}`}>{children}</div>;
}

export type StatTone = "brand" | "emerald" | "amber" | "rose" | "slate";

const STAT_DOT: Record<StatTone, string> = {
  brand: "bg-primary",
  emerald: "bg-success",
  amber: "bg-warning",
  rose: "bg-error",
  slate: "bg-outline",
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
    <div className="min-w-0 bg-surface p-4 sm:p-5">
      <div className="md-label-medium flex items-center gap-2 uppercase tracking-wider text-on-surface-variant">
        <span className={`h-1.5 w-1.5 rounded-full ${STAT_DOT[tone]}`} />
        {label}
      </div>
      <div className="md-headline-medium mt-2 break-words font-medium tabular-nums text-on-surface">{value}</div>
      {note && <div className="md-body-small mt-1.5 text-on-surface-variant">{note}</div>}
    </div>
  );
}
