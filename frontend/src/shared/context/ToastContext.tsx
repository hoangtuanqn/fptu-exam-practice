import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { IconButton } from "@/shared/ui/Button";

type Kind = "success" | "error";
interface Toast {
  id: number;
  kind: Kind;
  text: string;
}

interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// Snackbar Material Design 3: nền inverse-surface, chữ inverse-on-surface, nằm dưới giữa (compact) hoặc góc dưới trái (medium trở lên),
// tự tắt sau 4 giây, có nút đóng. Lỗi dùng vùng aria-live "alert", còn lại "status".
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (kind: Kind, text: string) => {
      const id = nextId.current++;
      setToasts((list) => [...list, { id, kind, text }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(() => ({ success: (t) => push("success", t), error: (t) => push("error", t) }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[80] flex flex-col items-center gap-2 px-4 medium:items-start expanded:items-start expanded:pl-6">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className="md-enter md-body-medium pointer-events-auto flex w-full max-w-[34rem] items-center gap-3 rounded-m3-xs bg-inverse-surface py-1.5 pl-4 pr-1 text-inverse-on-surface shadow-m3-3"
          >
            {t.kind === "success" ? <CheckCircle2 size={20} className="shrink-0 text-inverse-primary" /> : <CircleAlert size={20} className="shrink-0 text-inverse-primary" />}
            <span className="flex-1 py-2.5">{t.text}</span>
            <IconButton label="Đóng thông báo" onClick={() => dismiss(t.id)} className="!text-inverse-on-surface">
              <X size={18} />
            </IconButton>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast phải nằm trong ToastProvider");
  return ctx;
}
