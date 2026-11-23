import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

// Chủ đề giao diện: "system" theo prefers-color-scheme của hệ điều hành, hoặc ép "light" / "dark". Lưu ở trình duyệt.
export type ThemeMode = "system" | "light" | "dark";
const KEY = "fepass.theme";

interface ThemeApi {
  mode: ThemeMode;
  /** Chủ đề đang hiển thị thực tế (đã giải quyết "system") */
  resolved: "light" | "dark";
  /** origin: vị trí nút bấm (clientX/clientY) để nền mới lan tròn từ đó */
  setMode: (m: ThemeMode, origin?: { x: number; y: number }) => void;
}

type VTDocument = Document & { startViewTransition?: (cb: () => void) => { ready: Promise<void> } };

const ThemeContext = createContext<ThemeApi | null>(null);

const read = (): ThemeMode => {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
};

const systemDark = () => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;

// Gắn data-theme lên <html> (không đặt khi theo hệ thống: CSS tự dùng prefers-color-scheme) và đồng bộ màu thanh trình duyệt trên điện thoại
function apply(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
  const surface = getComputedStyle(root).getPropertyValue("--md-sys-color-surface").trim();
  if (surface) document.querySelector('meta[name="theme-color"]')?.setAttribute("content", surface);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(read);
  const [sysDark, setSysDark] = useState(systemDark);

  useEffect(() => apply(mode), [mode, sysDark]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSysDark(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const setMode = useCallback((m: ThemeMode, origin?: { x: number; y: number }) => {
    try {
      if (m === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, m);
    } catch {
      /* trình duyệt chặn lưu trữ: vẫn đổi được cho phiên hiện tại */
    }
    const doc = document as VTDocument;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!doc.startViewTransition || reduce || !origin) {
      setModeState(m);
      return;
    }
    // Chụp ảnh màn cũ, đổi chủ đề, rồi vòng tròn mới mở rộng từ nút bấm ra toàn màn hình
    const t = doc.startViewTransition(() => {
      flushSync(() => {
        apply(m);
        setModeState(m);
      });
    });
    t.ready.then(() => {
      const r = Math.hypot(Math.max(origin.x, innerWidth - origin.x), Math.max(origin.y, innerHeight - origin.y));
      document.documentElement.animate(
        { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${r}px at ${origin.x}px ${origin.y}px)`] },
        { duration: 650, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" }
      );
    });
  }, []);

  const value = useMemo<ThemeApi>(() => ({ mode, resolved: mode === "system" ? (sysDark ? "dark" : "light") : mode, setMode }), [mode, sysDark, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme phải nằm trong ThemeProvider");
  return ctx;
}
