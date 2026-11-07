import { forwardRef, useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { IconButton } from "./Button";

// Ô nhập thô (không nhãn nổi) dùng khi cần tự bố cục: kiểu outlined của M3 (viền outline, focus đổi sang primary dày 2dp)
const RAW =
  "md-body-medium h-12 w-full rounded-m3-xs border bg-transparent px-4 text-on-surface placeholder:text-on-surface-variant outline-none md-motion " +
  "focus:border-primary focus:shadow-[inset_0_0_0_1px_var(--md-sys-color-primary)] disabled:border-on-surface/12 disabled:text-on-surface/38";

export const inputClass = (error?: string) => `${RAW} ${error ? "border-error shadow-[inset_0_0_0_1px_var(--md-sys-color-error)]" : "border-outline hover:border-on-surface"}`;

interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

// Nhãn tĩnh phía trên + điều khiển + dòng lỗi/gợi ý (supporting text): dùng cho ô chọn (select) và các form tự bố cục
export function Field({ label, error, hint, children }: FieldProps) {
  return (
    <label className="block">
      {label && <span className="md-label-large mb-1.5 block text-on-surface-variant">{label}</span>}
      {children}
      {error ? (
        <span role="alert" className="md-body-small mt-1 block px-4 text-error">
          {error}
        </span>
      ) : (
        hint && <span className="md-body-small mt-1 block px-4 text-on-surface-variant">{hint}</span>
      )}
    </label>
  );
}

type InputProps = InputHTMLAttributes<HTMLInputElement> & Omit<FieldProps, "children"> & { trailing?: ReactNode };

/**
 * Ô nhập "filled" của M3: nền surface-container-highest, nhãn nằm trong ô và thu nhỏ lên trên khi focus hoặc đã có chữ,
 * đường kẻ dưới đổi sang primary (dày 2dp) khi focus, error khi lỗi. Chữ gợi ý (placeholder) chỉ hiện khi đã focus (đặc tả M3).
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, hint, trailing, className = "", id, ...props }, ref) {
  const auto = useId();
  const inputId = id ?? auto;
  const describedBy = error || hint ? `${inputId}-support` : undefined;
  return (
    <div>
      <div className={`group relative rounded-t-m3-xs bg-surface-container-highest md-motion ${props.disabled ? "opacity-[0.38]" : ""}`}>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          placeholder={props.placeholder ?? " "}
          className={`md-body-medium peer block h-14 w-full rounded-t-m3-xs bg-transparent px-4 text-on-surface outline-none placeholder:text-transparent focus:placeholder:text-on-surface-variant ${
            label ? "pb-1 pt-5" : ""
          } ${trailing ? "pr-12" : ""} ${className}`}
          {...props}
        />
        {label && (
          <label
            htmlFor={inputId}
            className={`md-body-medium pointer-events-none absolute left-4 top-4 origin-left text-on-surface-variant md-motion peer-focus:top-1.5 peer-focus:text-xs peer-[:not(:placeholder-shown)]:top-1.5 peer-[:not(:placeholder-shown)]:text-xs ${
              error ? "!text-error" : "peer-focus:text-primary"
            }`}
          >
            {label}
          </label>
        )}
        {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
        {/* Đường kẻ dưới: 1dp (outline), dày lên 2dp màu primary khi focus */}
        <span
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-0 h-px md-motion peer-hover:h-0.5 peer-focus:h-0.5 ${
            error ? "bg-error" : "bg-on-surface-variant peer-focus:bg-primary"
          }`}
        />
      </div>
      {(error || hint) && (
        <p id={describedBy} role={error ? "alert" : undefined} className={`md-body-small mt-1 px-4 ${error ? "text-error" : "text-on-surface-variant"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
});

// Ô mật khẩu có nút hiện/ẩn
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, "trailing" | "type">>(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      ref={ref}
      type={visible ? "text" : "password"}
      trailing={
        <IconButton label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onClick={() => setVisible((v) => !v)} tabIndex={-1}>
          {visible ? <EyeOff size={20} /> : <Eye size={20} />}
        </IconButton>
      }
      {...props}
    />
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
