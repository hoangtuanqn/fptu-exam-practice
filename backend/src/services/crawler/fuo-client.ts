import type { CrawlerConfig } from "../../constants/crawler";
import { sleep } from "../../utils/sleep";

// Cookie hết hạn / chưa đăng nhập: server FuOverflow trả trang đăng nhập thay cho ảnh
export class FuoAuthError extends Error {}

export const FUO_AUTH_MESSAGE =
  "Cookie FuOverflow đã hết hạn hoặc chưa đăng nhập. Admin hãy cập nhật ở Quản trị → Cấu hình lấy đề.";

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 3; // lỗi mạng/máy chủ tạm thời thì thử lại (không thử lại lỗi đăng nhập hay 404)
const RETRY_BACKOFF_MS = [500, 1500];
const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface FuoClient {
  config: CrawlerConfig;
  /** GET kèm cookie/UA/referer; ném lỗi nếu HTTP không thành công */
  fetchOk(url: string, extraHeaders?: Record<string, string>): Promise<Response>;
  /** Nghỉ giữa hai request liên tiếp */
  pause(): Promise<void>;
}

// Client được dựng theo cấu hình tại thời điểm chạy job, nên admin đổi cookie là có hiệu lực ở lượt sau
export function createFuoClient(config: CrawlerConfig): FuoClient {
  const baseHeaders: Record<string, string> = {
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    "accept-language": "vi,en-US;q=0.9,en;q=0.8",
    "user-agent": config.userAgent,
    cookie: config.cookie,
    referer: config.referer,
  };

  return {
    config,
    async fetchOk(url, extraHeaders = {}) {
      for (let attempt = 1; ; attempt++) {
        try {
          const res = await fetch(url, {
            headers: { ...baseHeaders, ...extraHeaders },
            redirect: "follow",
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
          });
          if (res.status === 401 || res.status === 403) throw new FuoAuthError(`HTTP ${res.status} - ${url}`);
          if (res.ok) return res;
          const err = new Error(`HTTP ${res.status} ${res.statusText} - ${url}`);
          if (!RETRYABLE.has(res.status)) throw Object.assign(err, { fatal: true });
          throw err;
        } catch (err) {
          const fatal = err instanceof FuoAuthError || (err as { fatal?: boolean }).fatal;
          if (fatal || attempt >= MAX_ATTEMPTS) throw err;
          await sleep(RETRY_BACKOFF_MS[attempt - 1] ?? 1500);
        }
      }
    },
    pause: () => sleep(config.requestDelayMs),
  };
}
