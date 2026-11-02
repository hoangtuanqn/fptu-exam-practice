import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, Inbox, Loader2 } from "lucide-react";
import { Button } from "./Button";

export function Spinner({ className = "" }: { className?: string }) {
  return <Loader2 size={18} className={`animate-spin text-slate-400 ${className}`} aria-label="Đang tải" />;
}

// Khối chờ tải dùng cho cả trang/khối nội dung
export function Loading({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
      <Spinner /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/60 px-6 py-10 text-center">
      <CircleAlert className="text-rose-600" />
      <p className="text-sm text-slate-700">{message}</p>
      {onRetry && (
        <Button size="sm" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

export function Empty({ icon: Icon = Inbox, title, children }: { icon?: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <Icon size={28} className="text-slate-300" />
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {children && <div className="text-sm text-slate-500">{children}</div>}
    </div>
  );
}

// Thông báo lỗi trong form (lỗi chung, không thuộc trường nào)
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
      <CircleAlert size={16} className="mt-0.5 shrink-0" />
      {message}
    </div>
  );
}
