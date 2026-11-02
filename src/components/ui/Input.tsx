import { forwardRef, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";

const control =
  "w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:bg-slate-50 disabled:text-slate-500";

export const inputClass = (error?: string) => `${control} ${error ? "border-rose-400" : "border-slate-300"}`;

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

// Nhãn + ô nhập + dòng lỗi/gợi ý: dùng chung cho mọi form
export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>}
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-rose-600">{error}</span>
      ) : (
        hint && <span className="mt-1 block text-xs text-slate-500">{hint}</span>
      )}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & Omit<FieldProps, "children">;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, className = "", ...props },
  ref,
) {
  return (
    <Field label={label} error={error} hint={hint}>
      <input ref={ref} className={`${inputClass(error)} ${className}`} {...props} />
    </Field>
  );
});

// Ô mật khẩu có nút hiện/ẩn
export const PasswordInput = forwardRef<HTMLInputElement, InputProps>(function PasswordInput(
  { label, error, hint, className = "", ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);
  return (
    <Field label={label} error={error} hint={hint}>
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={`${inputClass(error)} pr-10 ${className}`}
          {...props}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-400 hover:text-slate-600"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </Field>
  );
});

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & Omit<FieldProps, "children">;

export function Select({ label, error, hint, className = "", children, ...props }: SelectProps) {
  return (
    <Field label={label} error={error} hint={hint}>
      <select className={`${inputClass(error)} ${className}`} {...props}>
        {children}
      </select>
    </Field>
  );
}
