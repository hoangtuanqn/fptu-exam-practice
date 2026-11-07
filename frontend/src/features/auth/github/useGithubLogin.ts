import { useCallback, useEffect, useRef, useState } from "react";
import { authApi } from "@/features/auth/auth.api";

// Cửa sổ GitHub gọi lại trang /auth/github/callback (cùng origin với web) và trang đó ghi kết quả vào localStorage.
// Dùng sự kiện "storage" thay vì window.opener vì GitHub có thể cắt liên kết giữa cửa sổ con và cửa sổ mở nó.
export const GITHUB_STATE_KEY = "fepass.github.state";
export const GITHUB_RESULT_KEY = "fepass.github.result";

export interface GithubResult {
  code?: string;
  state?: string;
  error?: string;
}

let configPromise: Promise<{ clientId: string; redirectUri: string } | null> | null = null;
const loadConfig = () =>
  (configPromise ??= authApi
    .githubConfig()
    .then((c) => (c.clientId && c.redirectUri ? { clientId: c.clientId, redirectUri: c.redirectUri } : null))
    .catch(() => null));

const randomState = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
};

/**
 * Đăng nhập bằng GitHub qua cửa sổ nhỏ (popup). Nạp sẵn cấu hình ngay khi trang mở để bấm nút là cửa sổ hiện ra liền
 * (trình duyệt chỉ cho mở popup trong lúc xử lý lượt bấm). `onCode` nhận mã dùng một lần để gửi lên backend đổi lấy phiên.
 */
export function useGithubLogin(onCode: (code: string) => void | Promise<void>, onError: (message: string) => void) {
  const [config, setConfig] = useState<{ clientId: string; redirectUri: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const handlers = useRef({ onCode, onError });
  handlers.current = { onCode, onError };

  useEffect(() => {
    let cancelled = false;
    void loadConfig().then((c) => !cancelled && setConfig(c));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== GITHUB_RESULT_KEY || !e.newValue) return;
      let result: GithubResult;
      try {
        result = JSON.parse(e.newValue) as GithubResult;
        localStorage.removeItem(GITHUB_RESULT_KEY);
      } catch {
        return;
      }
      const expected = localStorage.getItem(GITHUB_STATE_KEY);
      localStorage.removeItem(GITHUB_STATE_KEY);
      if (!expected || result.state !== expected) return; // không phải lượt đăng nhập do trang này mở
      if (!result.code) {
        setBusy(false);
        if (result.error && result.error !== "access_denied") handlers.current.onError("Không đăng nhập được bằng GitHub, vui lòng thử lại");
        return;
      }
      void Promise.resolve(handlers.current.onCode(result.code)).finally(() => setBusy(false));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const start = useCallback(() => {
    if (!config) return;
    const state = randomState();
    localStorage.setItem(GITHUB_STATE_KEY, state);
    const url = new URL("https://github.com/login/oauth/authorize");
    url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, scope: "read:user user:email", state }).toString();
    const w = 600;
    const h = 700;
    const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2);
    const popup = window.open(url.toString(), "fepass-github", `width=${w},height=${h},left=${left},top=${top}`);
    if (!popup) {
      localStorage.removeItem(GITHUB_STATE_KEY);
      handlers.current.onError("Trình duyệt đã chặn cửa sổ đăng nhập GitHub, hãy cho phép cửa sổ bật lên rồi thử lại");
      return;
    }
    setBusy(true);
    window.setTimeout(() => setBusy(false), 120_000); // đóng cửa sổ giữa chừng: tự mở lại nút
  }, [config]);

  return { available: Boolean(config), busy, start };
}
