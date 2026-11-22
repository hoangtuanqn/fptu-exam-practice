import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { CRAWLER_DEFAULTS } from "../src/constants/crawler";
import { FUO_SOURCE_FETCH_MISSING_DELAY_MS } from "../src/constants/fuo-source";
import { collectComments } from "../src/services/crawler/comment-scraper.service";
import { createFuoClient, FuoAuthError, type FuoClient, FuoRateLimitError, isFuoRateLimited } from "../src/services/crawler/fuo-client";
import { isFuoAuthFailure } from "../src/services/crawler/fuo-session.service";
import type { ImageRef } from "../src/services/crawler/types";
import { slowCrawlConfig } from "../src/utils/fuo-source-queue";

describe("slowCrawlConfig", () => {
  it("forces one request at a time and at least the fetch-missing delay", () => {
    const slow = slowCrawlConfig({ ...CRAWLER_DEFAULTS, concurrency: 4, requestDelayMs: 300 });
    assert.equal(slow.concurrency, 1);
    assert.equal(slow.requestDelayMs, FUO_SOURCE_FETCH_MISSING_DELAY_MS);
  });

  it("keeps a slower admin delay", () => {
    assert.equal(slowCrawlConfig({ ...CRAWLER_DEFAULTS, requestDelayMs: 5000 }).requestDelayMs, 5000);
  });
});

describe("collectComments auth errors", () => {
  const image = { name: "Q1", url: "https://example.test/q1.png", mediaUrl: "https://example.test/media/1", fileBase: "Q1" } as ImageRef;
  const client: FuoClient = { config: CRAWLER_DEFAULTS, pause: async () => undefined, fetchOk: async () => Promise.reject(new FuoAuthError("HTTP 403")) };

  it("ignores them by default (comments are optional)", async () => {
    assert.deepEqual((await collectComments(client, image)).comments, []);
  });

  it("fails the attempt in bulk mode", async () => {
    const err = await collectComments(client, image, { rethrowAuth: true }).catch((e: unknown) => e);
    assert.ok(isFuoAuthFailure(err));
  });
});

describe("createFuoClient rate limit", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });
  const stub = (status: number) => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls++;
      return new Response("", { status });
    }) as typeof fetch;
    return () => calls;
  };

  it("stops on the first 429 without retrying when stopOnRateLimit is set", async () => {
    const calls = stub(429);
    const err = await createFuoClient(CRAWLER_DEFAULTS, { stopOnRateLimit: true }).fetchOk("https://example.test/").catch((e: unknown) => e);
    assert.ok(err instanceof FuoRateLimitError);
    assert.ok(isFuoRateLimited(new Error("wrapped", { cause: err })));
    assert.equal(calls(), 1);
  });

  it("does not retry 403 (auth) either", async () => {
    const calls = stub(403);
    const err = await createFuoClient(CRAWLER_DEFAULTS, { stopOnRateLimit: true }).fetchOk("https://example.test/").catch((e: unknown) => e);
    assert.ok(err instanceof FuoAuthError);
    assert.equal(calls(), 1);
  });
});
