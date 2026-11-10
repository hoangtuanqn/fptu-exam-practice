import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { isPro } from "@/shared/utils/pro";
import { adsApi } from "./ads.api";
import { AD_SCRIPTS, isAdPath, viewerMayHaveAds, type AdsPublicConfig } from "./ads.rules";

// Không vẽ gì. Quyết định có nạp script quảng cáo (Monetag) hay không, theo cài đặt admin, người xem và trang đang mở.
//  - Mặc định TẮT: chưa bật trong admin thì không nạp gì.
//  - Không nạp ở trang làm bài, admin, đăng nhập, nạp tiền, Điểm FAP, hồ sơ...; không nạp cho gói Pro và admin.
//  - Nạp muộn (sau khi trang vẽ xong), mỗi loại một lần.
//  - Script đã nạp thì KHÔNG gỡ lại được: nếu người dùng đi sang trang không được phép (hoặc đổi sang Pro), tải lại trang để script biến mất.
const LOAD_DELAY_MS = 3000;
const loaded = new Set<string>(); // các loại đã nạp trong lần tải trang này

const inject = (kind: keyof typeof AD_SCRIPTS, zone: string) => {
  if (loaded.has(kind)) return;
  loaded.add(kind);
  const s = document.createElement("script");
  s.dataset.zone = zone;
  s.dataset.fepassAd = kind;
  s.async = true;
  s.src = AD_SCRIPTS[kind];
  document.body.appendChild(s);
};

export function AdLoader() {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();
  const [config, setConfig] = useState<AdsPublicConfig | null>(null);

  useEffect(() => {
    let alive = true;
    adsApi
      .config()
      .then((c) => alive && setConfig(c))
      .catch(() => undefined); // lỗi mạng: coi như không có quảng cáo
    return () => {
      alive = false;
    };
  }, []);

  const mayHaveAds = !loading && viewerMayHaveAds(config, { loggedIn: !!user, isPro: isPro(user), isAdmin: user?.role === "ADMIN" });
  const allowedHere = mayHaveAds && isAdPath(pathname);

  // Đang có script mà không còn được phép (đi sang trang khác, hoặc vừa lên Pro): tải lại để gỡ script
  useEffect(() => {
    if (loaded.size > 0 && !loading && (!mayHaveAds || !isAdPath(pathname))) window.location.reload();
  }, [mayHaveAds, pathname, loading]);

  useEffect(() => {
    if (!allowedHere || !config) return;
    const timer = setTimeout(() => {
      if (config.vignette) inject("vignette", config.vignette);
      if (config.inpage) inject("inpage", config.inpage);
    }, LOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, [allowedHere, config]);

  return null;
}
