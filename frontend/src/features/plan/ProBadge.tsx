import { Crown } from "lucide-react";

// Huy hiệu vàng "PRO" cạnh tên người dùng đang trong thời hạn Pro. Màu cố định (vàng đậm, chữ nâu) nên đọc rõ ở cả giao diện sáng và tối.
export function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span
      title="Thành viên Pro"
      className={`inline-flex shrink-0 items-center gap-0.5 rounded-full bg-gradient-to-b from-[#ffd75e] to-[#f0a800] px-1.5 py-px text-[10px] font-bold leading-4 tracking-wide text-[#3a2600] ${className}`}
    >
      <Crown size={10} strokeWidth={2.6} /> PRO
    </span>
  );
}
