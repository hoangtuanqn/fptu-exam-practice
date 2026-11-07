import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { CircleAlert, Inbox } from "lucide-react";
import { Button } from "./Button";

// Chỉ báo tiến trình tròn không xác định (M3): cung chạy quay, màu primary
export function Spinner({ className = "", size = 20 }: { className?: string; size?: number }) {
  return (
    <svg
      role="progressbar"
      aria-label="Đang tải"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={`text-primary motion-safe:[animation:md-spin_1.4s_linear_infinite] ${className}`}
    >
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="42 100" />
    </svg>
  );
}

// Chỉ báo tiến trình tuyến tính (M3): xác định khi có value (0..1), không xác định khi bỏ qua
export function LinearProgress({ value, label = "Tiến độ" }: { value?: number; label?: string }) {
  const determinate = value !== undefined;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={determinate ? Math.round(value * 100) : undefined}
      className="relative h-1 w-full overflow-hidden rounded-full bg-surface-container-highest"
    >
      {determinate ? (
        <div className="md-motion h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} />
      ) : (
        <div className="absolute inset-y-0 w-1/2 rounded-full bg-primary motion-safe:[animation:md-linear-indeterminate_1.6s_var(--md-sys-motion-easing-standard)_infinite]" />
      )}
    </div>
  );
}

// Khối chờ tải dùng cho cả trang/khối nội dung
export function Loading({ label = "Đang tải…" }: { label?: string }) {
  return (
    <div className="md-body-medium flex items-center justify-center gap-3 py-16 text-on-surface-variant">
      <Spinner /> {label}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center gap-3 rounded-m3-md bg-error-container px-6 py-10 text-center text-on-error-container">
      <CircleAlert />
      <p className="md-body-medium">{message}</p>
      {onRetry && (
        <Button size="sm" variant="tonal" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

export function Empty({ icon: Icon = Inbox, title, children }: { icon?: LucideIcon; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
      <Icon size={32} className="text-outline" />
      <p className="md-title-small text-on-surface">{title}</p>
      {children && <div className="md-body-medium text-on-surface-variant">{children}</div>}
    </div>
  );
}

// Thông báo lỗi trong form (lỗi chung, không thuộc trường nào)
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="md-body-medium flex items-start gap-3 rounded-m3-sm bg-error-container px-4 py-3 text-on-error-container">
      <CircleAlert size={20} className="mt-0.5 shrink-0" />
      {message}
    </div>
  );
}
