import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";

const openModals: object[] = []; // hộp thoại đang mở theo thứ tự: chỉ hộp trên cùng nhận Esc/Tab (hộp xác nhận mở chồng lên hộp khác)
const FOCUSABLE = 'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';

/**
 * Hộp thoại Material Design 3: nền scrim (màu scrim 32%), khung surface-container-high bo góc extra-large (28dp), độ nổi mức 3.
 * Vẽ thẳng vào <body> (portal): nếu để trong cây giao diện, một phần tử cha có transform/animation/overflow sẽ trở thành
 * "khung chứa" của lớp phủ position:fixed và làm nó chỉ phủ một mảng nhỏ thay vì cả màn hình.
 * Truy cập: role=dialog + aria-modal, nhốt phím Tab trong hộp, Esc để đóng, trả focus về nút đã mở hộp thoại khi đóng.
 */
export function Modal({ children, onClose, wide = false, light = false }: { children: ReactNode; onClose?: () => void; wide?: boolean; light?: boolean }) {
  // light: nền phủ rất nhạt để vẫn thấy rõ nội dung phía sau (ví dụ hộp chọn chế độ nằm đè lên đề đã mở)
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const node = box.current;
    const token = {};
    openModals.push(token);
    // Đưa focus vào hộp: ưu tiên phần tử có autoFocus, không thì khung hộp
    (node?.querySelector<HTMLElement>("[autofocus]") ?? node)?.focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (openModals[openModals.length - 1] !== token) return;
      if (e.key === "Escape" && onClose) return onClose();
      if (e.key !== "Tab" || !node) return;
      const items = Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
      if (items.length === 0) return e.preventDefault();
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && (document.activeElement === first || document.activeElement === node)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      openModals.splice(openModals.indexOf(token), 1);
      opener?.focus?.({ preventScroll: true });
    };
  }, [onClose]);

  return createPortal(
    <div
      // Bấm vào vùng nền (scrim) bên ngoài hộp thoại thì đóng (chỉ khi bấm đúng nền, không phải khi bấm trong hộp)
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      className={`md-scrim-in fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto ${light ? "bg-scrim/10" : "bg-scrim/32"} p-4`}
    >
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={`md-enter my-auto max-h-full w-full ${wide ? "max-w-4xl" : "max-w-md"} overflow-y-auto rounded-m3-xl bg-surface-container-high p-6 text-on-surface shadow-m3-3 outline-none sm:p-7`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}

// Tiêu đề hộp thoại (headline-small): biểu tượng tròn tông secondary + tên
export function ModalTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary-container text-on-secondary-container">
        <Icon size={20} />
      </div>
      <h2 className="md-headline-small text-on-surface">{children}</h2>
    </div>
  );
}

// Hàng nút cuối hộp thoại: nút nằm sát phải theo M3 (nút phụ bên trái nút chính)
export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-wrap justify-end gap-2">{children}</div>;
}
