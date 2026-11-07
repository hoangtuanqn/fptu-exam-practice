import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { IconButton } from "@/shared/ui/Button";

type Kind = "success" | "error";
// Nút hành động trên snackbar (M3: tối đa một): "Hoàn tác" cho thao tác đảo ngược được, "Thử lại" cho lỗi tạm thời
export interface ToastAction {
  label: string;
  onClick: () => void;
}
interface ToastOptions {
  action?: ToastAction;
  /** Mili giây trước khi tự tắt. Mặc định 4000; có nút hành động thì 8000 để kịp bấm. */
  duration?: number;
  /** Chạy khi snackbar tự tắt hoặc bị đóng mà KHÔNG bấm nút hành động (vd chốt xóa thật sau thời gian hoàn tác). */
  onExpire?: () => void;
}
interface Toast extends ToastOptions {
  id: number;
  kind: Kind;
  text: string;
}

interface ToastApi {
  success: (text: string, options?: ToastOptions) => void;
  error: (text: string, options?: ToastOptions) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

// Snackbar Material Design 3: nền inverse-surface, chữ inverse-on-surface, nằm dưới giữa (compact) hoặc góc dưới trái (medium trở lên),
// tự tắt sau 4 giây, có nút đóng. Lỗi dùng vùng aria-live "alert", còn lại "status".
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const live = useRef(new Map<number, Toast>());

  // expire=true: hết giờ hoặc bị đóng tay (chạy onExpire); false: người dùng bấm nút hành động (bỏ onExpire)
  const dismiss = useCallback((id: number, expire = true) => {
    clearTimeout(timers.current.get(id));
    timers.current.delete(id);
    const t = live.current.get(id);
    live.current.delete(id);
    setToasts((list) => list.filter((x) => x.id !== id));
    if (expire) t?.onExpire?.();
  }, []);

  const push = useCallback(
    (kind: Kind, text: string, options: ToastOptions = {}) => {
      const id = nextId.current++;
      const toast: Toast = { id, kind, text, ...options };
      live.current.set(id, toast);
      setToasts((list) => [...list, toast]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), options.duration ?? (options.action ? 8000 : 4000)),
      );
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(() => ({ success: (t, o) => push("success", t, o), error: (t, o) => push("error", t, o) }), [push]);

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
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  dismiss(t.id, false);
                  t.action!.onClick();
                }}
                className="md-label-large md-state min-h-10 shrink-0 rounded-full px-3 text-inverse-primary"
              >
                {t.action.label}
              </button>
            )}
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
