import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Chủ đề giao diện: "system" theo prefers-color-scheme của hệ điều hành, hoặc ép "light" / "dark". Lưu ở trình duyệt.
export type ThemeMode = "system" | "light" | "dark";
const KEY = "fepass.theme";

interface ThemeApi {
  mode: ThemeMode;
  /** Chủ đề đang hiển thị thực tế (đã giải quyết "system") */
  resolved: "light" | "dark";
  setMode: (m: ThemeMode) => void;
}

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

  const setMode = useCallback((m: ThemeMode) => {
    try {
      if (m === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, m);
    } catch {
      /* trình duyệt chặn lưu trữ: vẫn đổi được cho phiên hiện tại */
    }
    setModeState(m);
  }, []);

  const value = useMemo<ThemeApi>(() => ({ mode, resolved: mode === "system" ? (sysDark ? "dark" : "light") : mode, setMode }), [mode, sysDark, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme phải nằm trong ThemeProvider");
  return ctx;
}
