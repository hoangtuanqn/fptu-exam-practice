import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Khung hộp thoại căn giữa, nền mờ phía sau
export function Modal({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-md">
      <div className="w-full max-w-md animate-fade-in rounded-3xl border border-white bg-white p-7 shadow-pop">{children}</div>
    </div>
  );
}

// Tiêu đề hộp thoại: icon tròn + tên
export function ModalTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Icon size={20} />
      </div>
      <h2 className="text-xl font-semibold text-slate-900">{children}</h2>
    </div>
  );
}

// Hàng nút cuối hộp thoại
export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex gap-2">{children}</div>;
}
