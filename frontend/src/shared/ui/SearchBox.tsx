import { Search } from "lucide-react";
import { inputClass } from "./Input";

// Ô tìm kiếm của các bảng/bộ lọc: kính lúp bên trái + ô nhập dùng chung kiểu (viền, focus, hover) với mọi ô nhập khác.
export function SearchBox({
  value,
  onChange,
  placeholder,
  label,
  className = "min-w-52 flex-1",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string; // tên cho trình đọc màn hình
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} className={`${inputClass()} pl-9`} />
    </div>
  );
}
