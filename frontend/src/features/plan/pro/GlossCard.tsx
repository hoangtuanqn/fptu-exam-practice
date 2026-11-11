import type { ReactNode } from "react";

// Thẻ có bề mặt chuyển sắc nhẹ, vạch sáng ở mép trên và hai lớp bóng đổ mềm. Đổi màu theo giao diện sáng/tối.
// `lift`: nhấc lên và viền ánh vàng khi rê chuột (dùng cho thẻ bấm/đọc nhanh, không dùng cho khối bảng).
export function GlossCard({ children, className = "", lift = false }: { children: ReactNode; className?: string; lift?: boolean }) {
  return (
    <div
      className={`relative rounded-m3-lg border border-outline-variant/70 bg-gradient-to-b from-surface-container-lowest to-surface-container-low shadow-[0_1px_2px_rgba(0,0,0,0.05),0_14px_30px_-16px_rgba(70,45,0,0.28)] ${
        lift ? "transition duration-300 hover:-translate-y-1 hover:border-[#ffc61f]/60 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_20px_40px_-16px_rgba(240,168,0,0.45)]" : ""
      } ${className}`}
    >
      <span aria-hidden className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#ffc61f]/60 to-transparent" />
      {children}
    </div>
  );
}
