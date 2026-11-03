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

// Nhóm nút chọn một: dùng thay cho ô chọn (select) với bộ lọc ít lựa chọn, thấy hết các lựa chọn ngay
export function Segmented<T extends string>({ value, options, onChange, label }: Props<T>) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          type="button"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition ${
            value === o.value ? "bg-ink text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
