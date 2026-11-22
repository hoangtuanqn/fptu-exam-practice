// Giới hạn số request chạy cùng lúc tự điều chỉnh theo kiểu AIMD (như điều khiển tắc nghẽn TCP):
// đủ một loạt thành công thì nới thêm 1, bị chặn (429/503/Cloudflare/timeout) thì giảm một nửa (không dưới min, không quá max).
// Thuần: thời gian, chờ và số ngẫu nhiên được truyền vào nên test được không cần đồng hồ thật.

export type Outcome = "ok" | "congested" | "neutral";
export type Release = (outcome: Outcome, retryAfterMs?: number) => void;

export interface AdaptiveLimiterOptions {
  initial: number;
  min: number;
  max: number;
  increaseAfter: number; // số lần thành công liên tiếp để nới thêm 1
  retryAfterMaxMs: number; // Retry-After dài hơn thì cắt còn chừng này
  jitterMs: number; // cộng ngẫu nhiên 0..jitterMs khi hết lượt nghỉ, để các request không ập vào cùng lúc
  floorRoundsMax: number; // số lần bị chặn liên tiếp khi đã ở mức min thì nghỉ dài
  cooldownMs: number; // thời gian nghỉ dài đó
  onCooldown?: (until: number) => void;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

export function createAdaptiveLimiter(o: AdaptiveLimiterOptions) {
  const now = o.now ?? Date.now;
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => void setTimeout(r, ms).unref()));
  const random = o.random ?? Math.random;
  let limit = Math.min(o.max, Math.max(o.min, o.initial));
  let inFlight = 0;
  let successes = 0;
  let seq = 0; // số thứ tự request được cấp lượt
  let lastCut = 0; // request cấp lượt trước lần giảm gần nhất không giảm thêm (một đợt lỗi chỉ tính một lần)
  let pausedUntil = 0;
  let cooldownUntil = 0;
  let floorHits = 0;
  let cooldowns = 0;
  let timer = false;
  const waiting: (() => void)[] = [];

  const pause = (ms: number) => (pausedUntil = Math.max(pausedUntil, now() + ms));

  function pump() {
    const wait = pausedUntil - now();
    if (wait > 0) {
      if (!timer && waiting.length) {
        timer = true;
        void sleep(wait + random() * o.jitterMs).then(() => {
          timer = false;
          pump();
        });
      }
      return;
    }
    while (waiting.length && inFlight < limit) {
      inFlight++;
      waiting.shift()!();
    }
  }

  function grant(): Release {
    const ticket = ++seq;
    let done = false;
    return (outcome, retryAfterMs) => {
      if (done) return;
      done = true;
      inFlight--;
      if (outcome === "ok") {
        if (++successes >= o.increaseAfter) {
          successes = 0;
          floorHits = 0;
          limit = Math.min(o.max, limit + 1);
        }
      } else if (outcome === "congested") {
        if (retryAfterMs && retryAfterMs > 0) pause(Math.min(retryAfterMs, o.retryAfterMaxMs));
        if (ticket > lastCut) {
          lastCut = seq;
          successes = 0;
          if (limit <= o.min && ++floorHits >= o.floorRoundsMax) {
            floorHits = 0;
            cooldowns++;
            cooldownUntil = pause(o.cooldownMs);
            o.onCooldown?.(cooldownUntil);
          }
          limit = Math.max(o.min, Math.floor(limit / 2));
        }
      }
      pump();
    };
  }

  return {
    /** Chờ tới lượt; gọi hàm trả về đúng một lần khi request xong, kèm kết quả để điều chỉnh giới hạn. */
    acquire(): Promise<Release> {
      return new Promise((resolve) => {
        waiting.push(() => resolve(grant()));
        pump();
      });
    },
    state: () => ({ limit, inFlight, waiting: waiting.length, pausedUntil, cooldownUntil, cooldowns }),
  };
}

export type AdaptiveLimiter = ReturnType<typeof createAdaptiveLimiter>;

/** Retry-After dạng số giây hoặc ngày giờ HTTP -> mili giây (undefined nếu không đọc được). */
export function parseRetryAfter(value: string | null, nowMs = Date.now()): number | undefined {
  if (!value) return undefined;
  const v = value.trim();
  if (/^\d+$/.test(v)) return Number(v) * 1000;
  const at = Date.parse(v);
  return Number.isNaN(at) ? undefined : Math.max(0, at - nowMs);
}

/** Đếm lỗi liên tiếp cùng loại: true khi đã đủ `max` lần liền nhau (một lần khác loại thì đếm lại). */
export function createStreak(max: number) {
  let n = 0;
  return (hit: boolean) => (hit ? ++n >= max : ((n = 0), false));
}
