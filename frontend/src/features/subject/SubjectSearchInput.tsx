import { Search } from "lucide-react";

// Ô tìm môn kiểu viên thuốc: kính lúp tròn vàng bóng bên trái, nền chuyển sắc, khi gõ thì viền vàng kèm vầng sáng.
export function SubjectSearchInput({ value, onChange, placeholder = "Gõ mã môn hoặc tên môn, ví dụ PRO192" }: { value: string; onChange: (value: string) => void; placeholder?: string }) {
  return (
    <label className="relative block">
      <span aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-b from-[#ffe58a] via-[#ffc61f] to-[#e89a00] text-[#3a2600] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_14px_-6px_rgba(240,168,0,0.7)]">
        <Search size={18} strokeWidth={2.4} />
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Tìm môn"
        className="h-14 w-full rounded-full border border-outline-variant/80 bg-gradient-to-b from-surface-container-lowest to-surface-container-low pl-16 pr-5 text-base shadow-[0_1px_2px_rgba(0,0,0,0.05),0_14px_30px_-16px_rgba(70,45,0,0.45)] outline-none transition placeholder:text-on-surface-variant focus:border-[#e0a100] focus:shadow-[0_0_0_4px_rgba(255,198,31,0.22),0_14px_30px_-16px_rgba(70,45,0,0.45)]"
      />
    </label>
  );
}
