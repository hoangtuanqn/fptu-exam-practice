import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MATERIAL_EST_TOKENS_BASE, MATERIAL_EST_TOKENS_PER_FIGURE, MATERIAL_EST_TOKENS_PER_PAGE } from "../src/constants/materials";
import { createTokenLedger, type TokenLedgerStore } from "../src/services/ai-token-ledger.service";
import type { TokenUsageInput } from "../src/repositories/ai-token-usage.repository";
import { estimateTokens } from "../src/utils/material-analysis";
import { availableAt, windowStatus, type TokenEntry } from "../src/utils/token-window";

const H = 3600 * 1000;
const W = 5 * H;
const NOW = new Date("2026-11-11T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);
const e = (msAgo: number, totalTokens: number): TokenEntry => ({ createdAt: ago(msAgo), totalTokens });

describe("token window (pure)", () => {
  it("sums only entries inside the rolling window", () => {
    const s = windowStatus([e(6 * H, 500), e(4 * H, 100), e(1 * H, 150)], 1000, W, NOW);
    assert.equal(s.used, 250);
    assert.equal(s.remaining, 750);
    assert.equal(s.percentUsed, 25);
  });

  it("an entry exactly windowMs old no longer counts; one millisecond younger still does", () => {
    assert.equal(windowStatus([e(W, 400)], 1000, W, NOW).used, 0);
    assert.equal(windowStatus([e(W - 1, 400)], 1000, W, NOW).used, 400);
    assert.equal(windowStatus([e(-1000, 400)], 1000, W, NOW).used, 0); // ghi "trong tương lai" (lệch đồng hồ) thì bỏ qua
  });

  it("resetsAt is when the oldest live entry expires, null when nothing is used", () => {
    const s = windowStatus([e(1 * H, 10), e(3 * H, 10), e(7 * H, 10)], 1000, W, NOW);
    assert.equal(s.resetsAt?.toISOString(), new Date(ago(3 * H).getTime() + W).toISOString());
    const empty = windowStatus([], 1000, W, NOW);
    assert.equal(empty.resetsAt, null);
    assert.equal(empty.percentUsed, 0);
    assert.equal(empty.remaining, 1000);
  });

  it("percent is an integer 0-100, at least 1 when anything is used, capped at 100", () => {
    assert.equal(windowStatus([e(H, 1)], 1_000_000, W, NOW).percentUsed, 1);
    assert.equal(windowStatus([e(H, 333)], 1000, W, NOW).percentUsed, 33);
    assert.equal(windowStatus([e(H, 5000)], 1000, W, NOW).percentUsed, 100);
    assert.equal(windowStatus([e(H, 5000)], 1000, W, NOW).remaining, 0);
  });

  it("availableAt: now when enough is left, otherwise when enough old usage has expired", () => {
    const entries = [e(4 * H, 300), e(2 * H, 300), e(1 * H, 300)]; // dùng 900 / 1000
    assert.equal(availableAt(entries, 1000, W, 100, NOW)?.getTime(), NOW.getTime());
    // cần 400: lượt 4 giờ trước hết tính sau 1 giờ nữa -> còn 400
    assert.equal(availableAt(entries, 1000, W, 400, NOW)?.toISOString(), new Date(NOW.getTime() + H).toISOString());
    // cần 700: phải đợi thêm lượt 2 giờ trước (hết tính sau 3 giờ)
    assert.equal(availableAt(entries, 1000, W, 700, NOW)?.toISOString(), new Date(NOW.getTime() + 3 * H).toISOString());
    assert.equal(availableAt(entries, 1000, W, 1001, NOW), null); // lớn hơn cả giới hạn
  });
});

describe("token ledger", () => {
  const memoryStore = () => {
    const rows: (TokenUsageInput & { createdAt: Date })[] = [];
    let clock = NOW;
    const store: TokenLedgerStore = {
      async record(u) {
        rows.push({ ...u, createdAt: clock });
      },
      async since(userId, feature, since) {
        return rows.filter((r) => r.userId === userId && r.feature === feature && r.createdAt > since).map((r) => ({ createdAt: r.createdAt, totalTokens: r.totalTokens }));
      },
    };
    return { rows, store, setClock: (d: Date) => (clock = d) };
  };

  it("records input + output + cache creation and keeps features and users apart", async () => {
    const m = memoryStore();
    const a = createTokenLedger({ feature: "material", limit: 10_000, windowMs: W, store: m.store });
    const b = createTokenLedger({ feature: "other", limit: 10_000, windowMs: W, store: m.store });
    await a.record(1, { input: 1000, output: 600, cacheCreation: 400 });
    await b.record(1, { input: 5000, output: 0, cacheCreation: 0 });
    await a.record(2, { input: 9000, output: 0, cacheCreation: 0 });
    assert.deepEqual(m.rows[0], { userId: 1, feature: "material", inputTokens: 1400, outputTokens: 600, totalTokens: 2000, createdAt: NOW });
    const s = await a.status(1, NOW);
    assert.equal(s.used, 2000);
    assert.equal(s.percentUsed, 20);
    assert.equal(s.resetsAt?.getTime(), NOW.getTime() + W);
    assert.equal((await a.status(1, new Date(NOW.getTime() + W))).used, 0); // hết cửa sổ
  });
});

describe("pre-check estimate", () => {
  it("is figure pages * per-figure + pages * per-page + base", () => {
    assert.equal(estimateTokens({ figurePages: 0, pages: 0 }), MATERIAL_EST_TOKENS_BASE);
    assert.equal(estimateTokens({ figurePages: 10, pages: 70 }), 10 * MATERIAL_EST_TOKENS_PER_FIGURE + 70 * MATERIAL_EST_TOKENS_PER_PAGE + MATERIAL_EST_TOKENS_BASE);
  });
});
