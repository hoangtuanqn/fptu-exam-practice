import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from "react";
import { http } from "@/shared/api/client";
import { isXmas, readCachedFlag, readDecor, writeCachedFlag, writeDecor } from "./season";

interface SeasonApi {
  xmas: boolean;
  /** Người dùng còn bật trang trí (tuyết + đồ trang trí; nút "Trang trí Giáng sinh" ở chân trang / menu tài khoản) */
  decor: boolean;
  setDecor: (on: boolean) => void;
  /** Đang mùa và người dùng chưa tắt trang trí: điều kiện hiện mọi đồ trang trí */
  showDecor: boolean;
}

// Mặc định khi nằm ngoài provider: giao diện thường
const SeasonContext = createContext<SeasonApi>({ xmas: false, decor: false, setDecor: () => {}, showDecor: false });

const FORCE = import.meta.env.VITE_SEASON as string | undefined;

export function SeasonProvider({ children }: { children: ReactNode }) {
  // Dùng cờ đã lưu lần trước làm giá trị đầu: không nháy; lỗi mạng giữ nguyên; chưa có gì lưu = tắt
  const [flag, setFlag] = useState(readCachedFlag);
  const [decor, setDecorState] = useState(readDecor);
  const xmas = isXmas(flag, new Date(), FORCE);

  // Gắn lên <html> như ThemeContext gắn data-theme; layout effect để có trước lần vẽ đầu
  // data-xmas-decor: người dùng còn bật trang trí (CSS đổi nền tối sang xanh thông chỉ khi có thuộc tính này)
  const showDecor = xmas && decor;
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (xmas) root.setAttribute("data-season", "xmas");
    else root.removeAttribute("data-season");
    if (showDecor) root.setAttribute("data-xmas-decor", "");
    else root.removeAttribute("data-xmas-decor");
  }, [xmas, showDecor]);

  useEffect(() => {
    if (FORCE === "xmas" || FORCE === "off") return;
    let alive = true;
    http
      .get<{ xmas?: unknown }>("/public/season")
      .then((r) => {
        if (!alive || typeof r?.xmas !== "boolean") return; // máy chủ cũ chưa có cờ: giữ giá trị đã lưu
        setFlag(r.xmas);
        writeCachedFlag(r.xmas);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const setDecor = useCallback((on: boolean) => {
    writeDecor(on);
    setDecorState(on);
  }, []);

  const value = useMemo(() => ({ xmas, decor, setDecor, showDecor }), [xmas, decor, setDecor, showDecor]);
  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
}

export const useSeason = () => useContext(SeasonContext);

const SeasonDecor = lazy(() => import("./SeasonDecor"));

// Gắn một lần ở App: chỉ tải code tuyết khi đang mùa và người dùng chưa tắt
export function SeasonLayer() {
  if (!useSeason().showDecor) return null;
  return (
    <Suspense fallback={null}>
      <SeasonDecor />
    </Suspense>
  );
}
