import { useCallback, useEffect, useRef, useState } from "react";
import { authApi } from "@/features/auth/auth.api";

// Phần tối thiểu của thư viện Google Identity Services mà ta dùng
interface TokenResponse {
  access_token?: string;
  error?: string;
}
interface TokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: { type: string }) => void;
          }) => TokenClient;
        };
      };
    };
  }
}

const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
let scriptPromise: Promise<void> | null = null;
let clientIdPromise: Promise<string | null> | null = null;

// Nạp thư viện Google một lần cho cả ứng dụng (không chặn việc hiển thị trang)
function loadScript(): Promise<void> {
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null; // lần sau thử lại
      reject(new Error("Không tải được thư viện Google"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

const loadClientId = () => (clientIdPromise ??= authApi.googleConfig().then((c) => c.clientId).catch(() => null));

/**
 * Đăng nhập bằng Google qua cửa sổ nhỏ (popup). Nạp sẵn thư viện ngay khi trang mở để bấm nút là cửa sổ hiện ra liền
 * (trình duyệt chỉ cho mở popup trong lúc xử lý lượt bấm). `onToken` nhận access token để gửi lên backend xác thực.
 */
export function useGoogleLogin(onToken: (accessToken: string) => void | Promise<void>, onError: (message: string) => void) {
  const [clientId, setClientId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const client = useRef<TokenClient | null>(null);
  const handlers = useRef({ onToken, onError });
  handlers.current = { onToken, onError };

  useEffect(() => {
    let cancelled = false;
    void loadClientId().then(async (id) => {
      if (!id || cancelled) return;
      setClientId(id);
      try {
        await loadScript();
        if (cancelled || !window.google) return;
        client.current = window.google.accounts.oauth2.initTokenClient({
          client_id: id,
          scope: "openid email profile",
          callback: (res) => {
            if (!res.access_token) {
              setBusy(false);
              if (res.error && res.error !== "access_denied") handlers.current.onError("Không đăng nhập được bằng Google, vui lòng thử lại");
              return;
            }
            void Promise.resolve(handlers.current.onToken(res.access_token)).finally(() => setBusy(false));
          },
          error_callback: () => setBusy(false), // đóng cửa sổ giữa chừng: không báo lỗi
        });
        setReady(true);
      } catch {
        /* không tải được thư viện (mạng/chặn quảng cáo): ẩn nút, vẫn đăng nhập bằng email được */
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const start = useCallback(() => {
    if (!client.current) return;
    setBusy(true);
    client.current.requestAccessToken();
  }, []);

  return { available: Boolean(clientId) && ready, busy, start };
}
