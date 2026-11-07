import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";

// Khung hộp thoại căn giữa, nền mờ phía sau.
// Vẽ thẳng vào <body> (portal): nếu để trong cây giao diện, một phần tử cha có transform/animation/overflow
// sẽ trở thành "khung chứa" của lớp phủ position:fixed và làm nó chỉ phủ một mảng nhỏ thay vì cả màn hình.
export function Modal({ children, onClose, wide = false }: { children: ReactNode; onClose?: () => void; wide?: boolean }) {
  // Bấm Esc để đóng
  useEffect(() => {
    if (!onClose) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      // Bấm vào vùng nền bên ngoài hộp thoại thì đóng (chỉ khi bấm đúng nền, không phải khi bấm trong hộp)
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-slate-900/30 p-4 backdrop-blur-md"
    >
      <div className={`my-auto max-h-full w-full ${wide ? "max-w-4xl" : "max-w-md"} animate-fade-in overflow-y-auto rounded-3xl border border-white bg-white p-5 shadow-pop sm:p-7`}>
        {children}
      </div>
    </div>,
    document.body,
  );
}

// Tiêu đề hộp thoại: icon tròn + tên
export function ModalTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
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
