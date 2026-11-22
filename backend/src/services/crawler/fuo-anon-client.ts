import {
  FUO_ANON_COOLDOWN_MS,
  FUO_ANON_FLOOR_ROUNDS_MAX,
  FUO_ANON_INCREASE_AFTER,
  FUO_ANON_JITTER_MS,
  FUO_ANON_LIMIT_INITIAL,
  FUO_ANON_LIMIT_MAX,
  FUO_ANON_LIMIT_MIN,
  FUO_ANON_MAX_ATTEMPTS,
  FUO_ANON_RETRY_AFTER_MAX_MS,
  FUO_ANON_RETRY_BACKOFF_MS,
  FUO_ANON_TIMEOUT_MS,
  FUO_ANON_USER_AGENT,
} from "../../constants/fuo-catalog";
import { type AdaptiveLimiter, type Outcome, createAdaptiveLimiter, parseRetryAfter } from "../../utils/adaptive-limiter";
import { sleep } from "../../utils/sleep";
import { isChallengePage, isLoginPage } from "./fuo-forum.service";

/**
 * Client FuOverflow ẩn danh cho lượt quét danh mục ("Load dữ liệu mới"): KHÔNG gửi cookie, không referer, không bao giờ dùng
 * tài khoản đã lưu hay đăng nhập. Trang cần đăng nhập thì báo lỗi FuoLoginRequiredError cho đúng trang đó, không thử cách khác.
 * Mọi request ẩn danh trong tiến trình đi qua MỘT bộ giới hạn AIMD dùng chung (anonFuoLimiter).
 */
export const FUO_LOGIN_REQUIRED_MESSAGE = "Trang này cần đăng nhập FuOverflow, không tải được khi không đăng nhập";
export const FUO_RATE_LIMITED_MESSAGE = "FuOverflow đang hạn chế truy cập, chưa tải được trang này";

export class FuoLoginRequiredError extends Error {
  constructor(readonly url: string) {
    super(FUO_LOGIN_REQUIRED_MESSAGE);
  }
}

export const isLoginRequired = (err: unknown) => err instanceof FuoLoginRequiredError || (err instanceof Error && err.cause instanceof FuoLoginRequiredError);

const RETRY = new Set([408, 425, 500, 502]); // lỗi tạm thời của máy chủ: thử lại, không coi là bị hạn chế
const CONGESTED = new Set([429, 503, 504]); // bị hạn chế/quá tải: giảm số request cùng lúc

const HEADERS: Record<string, string> = {
  accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "accept-language": "vi,en-US;q=0.9,en;q=0.8",
  "user-agent": FUO_ANON_USER_AGENT,
};

const cooldownListeners: ((until: number) => void)[] = [];

export const anonFuoLimiter: AdaptiveLimiter = createAdaptiveLimiter({
  initial: FUO_ANON_LIMIT_INITIAL,
  min: FUO_ANON_LIMIT_MIN,
  max: FUO_ANON_LIMIT_MAX,
  increaseAfter: FUO_ANON_INCREASE_AFTER,
  retryAfterMaxMs: FUO_ANON_RETRY_AFTER_MAX_MS,
  jitterMs: FUO_ANON_JITTER_MS,
  floorRoundsMax: FUO_ANON_FLOOR_ROUNDS_MAX,
  cooldownMs: FUO_ANON_COOLDOWN_MS,
  onCooldown: (until) => {
    console.warn(`[fuo-anon] FuOverflow chặn liên tục, tạm nghỉ tới ${new Date(until).toISOString()}`);
    cooldownListeners.forEach((fn) => fn(until));
  },
});

/** Đăng ký nhận báo khi bộ giới hạn chung phải nghỉ dài. */
export const onAnonCooldown = (fn: (until: number) => void) => void cooldownListeners.push(fn);

export interface AnonFuoClient {
  /** GET không cookie; ném lỗi nếu không lấy được trang (FuoLoginRequiredError nếu trang cần đăng nhập). */
  fetchOk(url: string, extraHeaders?: Record<string, string>): Promise<Response>;
}

// Không bao giờ gửi cookie/referer/xác thực, kể cả khi nơi gọi lỡ truyền vào
const SECRET_HEADERS = new Set(["cookie", "referer", "authorization"]);
const withoutSecrets = (h: Record<string, string>) => Object.fromEntries(Object.entries(h).filter(([k]) => !SECRET_HEADERS.has(k.toLowerCase())));

type Verdict = { outcome: Outcome; retryAfterMs?: number; result?: Response; error?: Error; retry?: boolean };

const isLoginUrl = (url: string) => {
  try {
    return /^\/login(\/|$)/.test(new URL(url).pathname);
  } catch {
    return false;
  }
};

// Phân loại một phản hồi: trang dùng được, cần đăng nhập, bị hạn chế (thử lại sau khi giảm tốc), lỗi tạm thời hay lỗi hẳn
async function judge(res: Response, url: string): Promise<Verdict> {
  const retryAfterMs = parseRetryAfter(res.headers.get("retry-after"));
  const challenged = !!res.headers.get("cf-mitigated");
  if (isLoginUrl(res.url || url)) {
    await res.body?.cancel();
    return { outcome: "ok", error: new FuoLoginRequiredError(url) };
  }
  if (CONGESTED.has(res.status) || challenged) {
    await res.body?.cancel();
    return { outcome: "congested", retryAfterMs, retry: true, error: new Error(`${FUO_RATE_LIMITED_MESSAGE} (HTTP ${res.status}) - ${url}`) };
  }
  const html = (res.headers.get("content-type") ?? "").includes("text/html") || res.status === 401 || res.status === 403 ? await res.clone().text() : "";
  if (isChallengePage(html)) {
    await res.body?.cancel();
    return { outcome: "congested", retryAfterMs, retry: true, error: new Error(`${FUO_RATE_LIMITED_MESSAGE} (Cloudflare) - ${url}`) };
  }
  if (res.status === 401 || res.status === 403 || isLoginPage(html)) {
    await res.body?.cancel();
    return { outcome: "ok", error: new FuoLoginRequiredError(url) };
  }
  if (res.ok) return { outcome: "ok", result: res };
  await res.body?.cancel();
  return { outcome: RETRY.has(res.status) ? "neutral" : "ok", retry: RETRY.has(res.status), error: new Error(`HTTP ${res.status} ${res.statusText} - ${url}`) };
}

export function createAnonymousFuoClient(limiter: AdaptiveLimiter = anonFuoLimiter): AnonFuoClient {
  return {
    async fetchOk(url, extraHeaders = {}) {
      for (let attempt = 1; ; attempt++) {
        const release = await limiter.acquire();
        let verdict: Verdict;
        try {
          const res = await fetch(url, { headers: { ...withoutSecrets(extraHeaders), ...HEADERS }, redirect: "follow", signal: AbortSignal.timeout(FUO_ANON_TIMEOUT_MS) });
          verdict = await judge(res, url);
        } catch (err) {
          // Timeout, mất kết nối, bị ngắt: coi như bị hạn chế
          verdict = { outcome: "congested", retry: true, error: err instanceof Error ? err : new Error(String(err)) };
        }
        release(verdict.outcome, verdict.retryAfterMs);
        if (verdict.result) return verdict.result;
        if (!verdict.retry || attempt >= FUO_ANON_MAX_ATTEMPTS) throw verdict.error ?? new Error(`Không tải được ${url}`);
        await sleep((FUO_ANON_RETRY_BACKOFF_MS[attempt - 1] ?? FUO_ANON_RETRY_BACKOFF_MS.at(-1)!) + Math.random() * FUO_ANON_JITTER_MS);
      }
    },
  };
}
