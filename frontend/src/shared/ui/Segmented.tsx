import { Check } from "lucide-react";

interface Option<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  label: string; // đọc cho trình đọc màn hình
}

// Nút phân đoạn (segmented button) M3: chọn một trong vài lựa chọn; phần được chọn nền secondary-container kèm dấu tích
export function Segmented<T extends string>({ value, options, onChange, label }: Props<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex h-10 max-w-full self-center overflow-x-auto overflow-y-hidden rounded-full border border-outline [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {options.map((o, i) => {
        const on = value === o.value;
        return (
          <button
            key={o.value}
            role="radio"
            type="button"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={`md-state md-motion md-label-large inline-flex h-full shrink-0 items-center justify-center gap-1.5 whitespace-nowrap px-3 sm:px-4 ${i > 0 ? "border-l border-outline" : ""} ${
              on ? "bg-secondary-container text-on-secondary-container" : "text-on-surface"
            }`}
          >
            {on && <Check size={16} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
