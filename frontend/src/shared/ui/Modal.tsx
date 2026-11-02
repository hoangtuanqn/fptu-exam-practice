import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

// Khung hộp thoại căn giữa, nền mờ phía sau
export function Modal({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-brand-900/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md animate-fade-in rounded-2xl bg-white p-6 shadow-2xl">{children}</div>
    </div>
  );
}

// Tiêu đề hộp thoại: icon tròn + tên
export function ModalTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-700">
        <Icon size={20} />
      </div>
      <h2 className="font-serif text-xl font-semibold text-slate-900">{children}</h2>
    </div>
  );
}

// Hàng nút cuối hộp thoại
export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex gap-2">{children}</div>;
}
