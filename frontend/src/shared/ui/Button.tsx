import type { ButtonHTMLAttributes, ReactNode } from "react";

// Nút Material Design 3. Các biến thể chuẩn: filled (hành động chính), tonal (phụ, nổi bật vừa), outlined (phụ), text (ít nhấn), elevated.
// Tên cũ (primary / secondary / danger / ghost) vẫn dùng được để không phải sửa hàng trăm chỗ gọi:
//   primary = filled, secondary = outlined, ghost = text, danger = filled màu error.
type Variant = "filled" | "tonal" | "outlined" | "text" | "elevated" | "primary" | "secondary" | "danger" | "ghost";
type Size = "md" | "sm";

interface StyleOptions {
  variant?: Variant;
  size?: Size;
  grow?: boolean; // giãn đều trong hàng flex (dùng cho cặp nút ở hộp thoại)
  className?: string;
}

const VARIANTS: Record<Exclude<Variant, "primary" | "secondary" | "danger" | "ghost">, string> = {
  filled: "bg-primary text-on-primary disabled:bg-on-surface/12 disabled:text-on-surface/38",
  tonal: "bg-secondary-container text-on-secondary-container disabled:bg-on-surface/12 disabled:text-on-surface/38",
  outlined: "border border-outline text-primary disabled:border-on-surface/12 disabled:text-on-surface/38",
  text: "text-primary disabled:text-on-surface/38",
  elevated: "bg-surface-container-low text-primary shadow-m3-1 disabled:bg-on-surface/12 disabled:text-on-surface/38 disabled:shadow-none",
};
const ALIAS = { primary: "filled", secondary: "outlined", ghost: "text" } as const;
const DANGER = "bg-error text-on-error disabled:bg-on-surface/12 disabled:text-on-surface/38";

// Chiều cao nhìn thấy 40dp (md) / 32dp (sm); vùng chạm luôn >= 48dp nhờ phần mở rộng vô hình (after)
const SIZES: Record<Size, string> = {
  md: "h-10 px-6 after:-inset-y-1",
  sm: "h-8 px-4 after:-inset-y-2",
};

// Tách riêng để các thẻ không phải <button> (ví dụ <label>, <Link>) cũng dùng được cùng kiểu nút
export function buttonClass({ variant = "outlined", size = "md", grow = false, className = "" }: StyleOptions = {}) {
  const key = variant === "danger" ? null : ((ALIAS as Record<string, string>)[variant] ?? variant);
  const textVariant = key === "text";
  return [
    "md-state md-motion md-label-large inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-full",
    "after:absolute after:inset-x-0 after:content-[''] disabled:pointer-events-none",
    SIZES[size],
    textVariant ? "!px-3" : "",
    key === null ? DANGER : VARIANTS[key as keyof typeof VARIANTS],
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

// Nút biểu tượng: vùng nhìn thấy 40dp, vùng chạm 48dp. `label` bắt buộc (đọc cho trình đọc màn hình, cũng là tooltip).
type IconVariant = "standard" | "filled" | "tonal" | "outlined";
const ICON_VARIANTS: Record<IconVariant, string> = {
  standard: "text-on-surface-variant disabled:text-on-surface/38",
  filled: "bg-primary text-on-primary disabled:bg-on-surface/12 disabled:text-on-surface/38",
  tonal: "bg-secondary-container text-on-secondary-container disabled:bg-on-surface/12 disabled:text-on-surface/38",
  outlined: "border border-outline text-on-surface-variant disabled:border-on-surface/12 disabled:text-on-surface/38",
};

export function IconButton({
  label,
  variant = "standard",
  selected,
  className = "",
  children,
  ...props
}: { label: string; variant?: IconVariant; selected?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={selected}
      className={`md-state md-motion relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full after:absolute after:-inset-1 after:content-[''] disabled:pointer-events-none ${
        selected && variant === "standard" ? "text-primary" : ICON_VARIANTS[variant]
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

// Nút hành động nổi (FAB): CHỈ dùng cho hành động chính duy nhất của một màn hình. Dùng primary-container, bo góc large, độ nổi mức 3.
export function Fab({
  label,
  extended = false,
  className = "",
  children,
  ...props
}: { label: string; extended?: boolean; children: ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={extended ? undefined : label}
      className={`md-state md-motion md-label-large inline-flex h-14 items-center justify-center gap-3 rounded-m3-lg bg-primary-container text-on-primary-container shadow-m3-3 ${
        extended ? "px-4" : "w-14"
      } ${className}`}
      {...props}
    >
      {children}
      {extended && <span>{label}</span>}
    </button>
  );
}
