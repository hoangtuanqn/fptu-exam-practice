import { useEffect, useRef } from "react";

interface TurnstileApi {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

let scriptReady: Promise<void> | null = null;
const loadScript = () =>
  (scriptReady ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptReady = null; // cho phép thử tải lại lần sau
      reject(new Error("Không tải được captcha"));
    };
    document.head.appendChild(s);
  }));

/** Captcha Cloudflare Turnstile. `onToken(null)` khi token hết hạn. Đổi `key` để làm mới (token chỉ dùng được một lần). Không có khoá site thì không hiện gì. */
export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const box = useRef<HTMLDivElement>(null);
  const cb = useRef(onToken);
  cb.current = onToken;

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let id: string | undefined;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !box.current || !window.turnstile) return;
        id = window.turnstile.render(box.current, {
          sitekey: TURNSTILE_SITE_KEY,
          language: "vi",
          size: window.innerWidth < 400 ? "compact" : "normal", // khung thường rộng 300px, vượt hộp thoại trên điện thoại nhỏ
          callback: (t: string) => cb.current(t),
          "expired-callback": () => cb.current(null),
          "error-callback": () => cb.current(null),
        });
      })
      .catch(() => cb.current(null));
    return () => {
      cancelled = true;
      if (id) window.turnstile?.remove(id);
    };
  }, []);

  return TURNSTILE_SITE_KEY ? <div ref={box} className="flex justify-center" /> : null;
}
