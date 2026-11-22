import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { FUO_ANON_USER_AGENT } from "../src/constants/fuo-catalog";
import { FUO_LOGIN_REQUIRED_MESSAGE, FuoLoginRequiredError, createAnonymousFuoClient, isLoginRequired } from "../src/services/crawler/fuo-anon-client";
import { type AdaptiveLimiterOptions, createAdaptiveLimiter, createStreak, parseRetryAfter } from "../src/utils/adaptive-limiter";

// Client FuOverflow ẩn danh và bộ giới hạn AIMD (thuần, đồng hồ giả, fetch giả; không gọi mạng)

const flush = () => new Promise((r) => setImmediate(r));

// Đồng hồ giả: sleep chỉ xong khi advance tới đúng lúc
function fakeClock() {
  let t = 1_000_000;
  const timers: { at: number; resolve: () => void }[] = [];
  return {
    now: () => t,
    sleep: (ms: number) => new Promise<void>((resolve) => timers.push({ at: t + ms, resolve })),
    async advance(ms: number) {
      t += ms;
      for (const x of timers.filter((x) => x.at <= t)) {
        timers.splice(timers.indexOf(x), 1);
        x.resolve();
      }
      await flush();
    },
  };
}

const base = (clock: ReturnType<typeof fakeClock>, extra: Partial<AdaptiveLimiterOptions> = {}) =>
  createAdaptiveLimiter({ initial: 4, min: 2, max: 6, increaseAfter: 3, retryAfterMaxMs: 60_000, jitterMs: 0, floorRoundsMax: 2, cooldownMs: 300_000, now: clock.now, sleep: clock.sleep, random: () => 0, ...extra });

describe("adaptive (AIMD) limiter", () => {
  it("never runs more than the current limit at once and queues the rest in order", async () => {
    const lim = base(fakeClock());
    const order: number[] = [];
    const releases = await Promise.all(Array.from({ length: 4 }, () => lim.acquire()));
    const queued = [1, 2].map((n) => lim.acquire().then((r) => (order.push(n), r)));
    await flush();
    assert.deepEqual({ inFlight: lim.state().inFlight, waiting: lim.state().waiting }, { inFlight: 4, waiting: 2 });
    releases[0]!("neutral");
    await flush();
    assert.deepEqual(order, [1]);
    releases[1]!("neutral");
    (await Promise.all(queued)).forEach((r) => r("neutral"));
    assert.deepEqual(order, [1, 2]);
  });

  it("adds one after a window of successes and never passes the hard cap", async () => {
    const lim = base(fakeClock());
    for (let i = 0; i < 30; i++) (await lim.acquire())("ok");
    assert.equal(lim.state().limit, 6);
  });

  it("halves once per burst of congestion (requests started before the cut do not cut again), floor min", async () => {
    const lim = base(fakeClock(), { floorRoundsMax: 99 });
    const burst = await Promise.all(Array.from({ length: 4 }, () => lim.acquire()));
    burst.forEach((r) => r("congested"));
    assert.equal(lim.state().limit, 2);
    (await lim.acquire())("congested");
    assert.equal(lim.state().limit, 2); // sàn
  });

  it("Retry-After pauses every request (capped), then resumes", async () => {
    const clock = fakeClock();
    const lim = base(clock, { retryAfterMaxMs: 10_000 });
    (await lim.acquire())("congested", 120_000);
    let got = false;
    void lim.acquire().then((r) => ((got = true), r("ok")));
    await flush();
    assert.equal(got, false);
    await clock.advance(9_999);
    assert.equal(got, false);
    await clock.advance(1);
    assert.equal(got, true);
  });

  it("repeated congestion at the floor triggers one long cool-down and reports it", async () => {
    const clock = fakeClock();
    const seen: number[] = [];
    const lim = base(clock, { initial: 2, onCooldown: (until) => seen.push(until) });
    (await lim.acquire())("congested");
    (await lim.acquire())("congested");
    assert.deepEqual({ cooldowns: lim.state().cooldowns, until: lim.state().cooldownUntil }, { cooldowns: 1, until: clock.now() + 300_000 });
    assert.deepEqual(seen, [clock.now() + 300_000]);
    let got = false;
    void lim.acquire().then((r) => ((got = true), r("ok")));
    await clock.advance(299_000);
    assert.equal(got, false);
    await clock.advance(1_000);
    assert.equal(got, true);
  });

  it("parses Retry-After as seconds or an HTTP date", () => {
    assert.equal(parseRetryAfter("30"), 30_000);
    assert.equal(parseRetryAfter(new Date(10_000).toUTCString(), 4_000), 6_000);
    assert.equal(parseRetryAfter("soon"), undefined);
    assert.equal(parseRetryAfter(null), undefined);
  });

  it("streak: true only after max hits in a row; another outcome resets it", () => {
    const hit = createStreak(3);
    assert.deepEqual([true, true, false, true, true, true].map(hit), [false, false, false, false, false, true]);
  });
});

describe("anonymous FuOverflow client", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });
  const limiter = () => createAdaptiveLimiter({ initial: 4, min: 2, max: 8, increaseAfter: 10, retryAfterMaxMs: 50, jitterMs: 0, floorRoundsMax: 99, cooldownMs: 1000 });
  // fetch giả: trả lần lượt các phản hồi, ghi lại header đã gửi
  const mockFetch = (responses: (() => Response)[]) => {
    const calls: Headers[] = [];
    globalThis.fetch = (async (_url: string, init?: RequestInit) => {
      calls.push(new Headers(init?.headers));
      return responses[Math.min(calls.length - 1, responses.length - 1)]!();
    }) as typeof fetch;
    return calls;
  };
  const html = (body: string, status = 200, headers: Record<string, string> = {}) => () => new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", ...headers } });

  it("sends no cookie, referer or authorization, and a plain browser User-Agent", async () => {
    const calls = mockFetch([html("<html data-template='forum_view'></html>")]);
    const res = await createAnonymousFuoClient(limiter()).fetchOk("https://fuoverflow.com/forums/PRJ301/", { cookie: "xf_user=1", Referer: "x", authorization: "y" });
    assert.equal(res.status, 200);
    assert.equal(calls.length, 1);
    assert.equal(calls[0]!.get("cookie"), null);
    assert.equal(calls[0]!.get("referer"), null);
    assert.equal(calls[0]!.get("authorization"), null);
    assert.equal(calls[0]!.get("user-agent"), FUO_ANON_USER_AGENT);
  });

  it("a login page, a login redirect or a plain 403 is 'login required' (no retry)", async () => {
    for (const r of [
      html("<html lang='vi' data-template='login'></html>"),
      html("<html data-template='error'>no permission</html>", 403),
      () => Object.defineProperty(new Response("", { status: 200 }), "url", { value: "https://fuoverflow.com/login/" }),
    ]) {
      const calls = mockFetch([r]);
      await assert.rejects(createAnonymousFuoClient(limiter()).fetchOk("https://fuoverflow.com/forums/X/"), (e: Error) => e instanceof FuoLoginRequiredError && e.message === FUO_LOGIN_REQUIRED_MESSAGE && isLoginRequired(e));
      assert.equal(calls.length, 1);
    }
  });

  it("a Cloudflare challenge (even as 403) or 429 is congestion: slows down and retries, never 'login required'", async () => {
    const lim = limiter();
    const calls = mockFetch([html("<html><title>Just a moment...</title></html>", 403), html("", 429, { "retry-after": "1" }), html("<html data-template='forum_view'></html>")]);
    const res = await createAnonymousFuoClient(lim).fetchOk("https://fuoverflow.com/forums/X/");
    assert.equal(res.status, 200);
    assert.equal(calls.length, 3);
    assert.equal(lim.state().limit, 2); // 4 -> 2 -> sàn 2
  });

  it("404 is not retried and not treated as login", async () => {
    const calls = mockFetch([html("nope", 404)]);
    await assert.rejects(createAnonymousFuoClient(limiter()).fetchOk("https://fuoverflow.com/forums/X/"), (e: Error) => /HTTP 404/.test(e.message) && !isLoginRequired(e));
    assert.equal(calls.length, 1);
  });
});
