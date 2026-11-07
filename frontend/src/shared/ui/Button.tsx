import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "md" | "sm";

interface StyleOptions {
  variant?: Variant;
  size?: Size;
  grow?: boolean; // giãn đều trong hàng flex (dùng cho cặp nút ở hộp thoại)
  className?: string;
}

const VARIANTS: Record<Variant, string> = {
  primary: "bg-brand-500 text-brand-900 shadow-sm shadow-brand-500/30 hover:bg-brand-400 hover:shadow-md hover:shadow-brand-500/30",
  secondary: "border border-slate-200 bg-white text-slate-700 shadow-soft hover:border-slate-300 hover:bg-slate-50",
  danger: "bg-rose-600 text-white shadow-sm hover:bg-rose-700",
  ghost: "text-slate-600 hover:bg-slate-900/5 hover:text-slate-900",
};
const SIZES: Record<Size, string> = {
  md: "px-4 py-2.5",
  sm: "px-3 py-2",
};

// Tách riêng để các thẻ không phải <button> (ví dụ <label>) cũng dùng được cùng kiểu nút
export function buttonClass({ variant = "secondary", size = "md", grow = false, className = "" }: StyleOptions = {}) {
  return [
    "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium transition duration-150 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40",
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
