import { inputClass } from "./Input";
import { SearchStatusIcon } from "./SearchStatusIcon";

// Ô tìm kiếm của các bảng/bộ lọc: kính lúp bên trái + ô nhập dùng chung kiểu (viền, focus, hover) với mọi ô nhập khác.
export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
  className = "min-w-52 flex-1",
  busy,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string; // tên cho trình đọc màn hình
  className?: string;
  busy?: boolean; // đang tìm: kính lúp đổi thành vòng xoay
}) {
  return (
    <div className={`relative ${className}`}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">
        <SearchStatusIcon busy={busy} />
      </span>
      <input data-search value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} className={`${inputClass()} pl-9`} />
    </div>
  );
}
