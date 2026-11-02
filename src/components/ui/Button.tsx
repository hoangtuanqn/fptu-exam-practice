import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary";
type Size = "md" | "sm";

interface StyleOptions {
  variant?: Variant;
  size?: Size;
  grow?: boolean; // giãn đều trong hàng flex (dùng cho cặp nút ở hộp thoại)
  className?: string;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-900 text-white hover:bg-brand-800",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
};
const SIZES: Record<Size, string> = {
  md: "px-4 py-2",
  sm: "px-3 py-2",
};

// Tách riêng để các thẻ không phải <button> (ví dụ <label>) cũng dùng được cùng kiểu nút
export function buttonClass({ variant = "secondary", size = "md", grow = false, className = "" }: StyleOptions = {}) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition disabled:opacity-40",
    VARIANTS[variant],
    SIZES[size],
    grow ? "flex-1" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Button({
  variant,
  size,
  grow,
  className,
  ...props
}: StyleOptions & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={buttonClass({ variant, size, grow, className })} {...props} />;
}
