import type { ReactNode } from "react";

export type Tone = "neutral" | "success" | "danger" | "warning" | "info";

// Nhãn trạng thái dạng chip M3 (assist chip tĩnh): nền container của vai trò tương ứng, chữ on-container (đạt AA)
const TONES: Record<Tone, string> = {
  neutral: "bg-surface-container-high text-on-surface-variant",
  success: "bg-success-container text-on-success-container",
  danger: "bg-error-container text-on-error-container",
  warning: "bg-warning-container text-on-warning-container",
  info: "bg-primary-container text-on-primary-container",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`md-label-medium inline-flex h-6 items-center gap-1.5 whitespace-nowrap rounded-m3-sm px-2.5 ${TONES[tone]}`}>{children}</span>;
}
