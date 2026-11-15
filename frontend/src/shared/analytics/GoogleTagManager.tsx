import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

// ID container GTM đặt ở VITE_GTM_ID (frontend/.env.production). Không đặt thì không nạp GTM.
const GTM_ID = import.meta.env.VITE_GTM_ID as string | undefined;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

// Chỉ chạy trên bản production thật: không chạy khi dev, xem thử bản build ở máy (localhost) hay trên tên miền khác
const enabled = () => !!GTM_ID && import.meta.env.PROD && /(^|\.)fepass\.top$/.test(window.location.hostname);

// Nạp Google Tag Manager một lần, rồi báo cho GTM mỗi khi người dùng đổi trang (SPA không tải lại trang).
// Trong GTM: tạo trigger kiểu "Custom Event" tên `route_change` (hoặc "History Change") cho thẻ GA4 page_view.
export function GoogleTagManager() {
  const { pathname, search } = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (!enabled()) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      // gtag cần đúng đối tượng `arguments`, không phải mảng
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer.push(arguments);
    };
    window.gtag("js", new Date());
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${GTM_ID}`;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (first.current) {
      first.current = false; // lần vào trang đầu đã được gtm.js tính, chỉ báo từ lần chuyển trang sau
      return;
    }
    if (!enabled()) return;
    window.dataLayer.push({ event: "route_change", page_path: pathname + search, page_location: window.location.href, page_title: document.title });
  }, [pathname, search]);

  return null;
}
