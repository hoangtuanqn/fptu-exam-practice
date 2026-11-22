import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import { Prisma, TransactionType } from "@prisma/client";
import { USER_NOTICE_BROADCAST_BATCH, USER_NOTICE_LEVELS, USER_NOTICE_READ_MAX_IDS, WALLET_NOTICE_LINK } from "../src/constants/user-notice";
import { realtimeHub } from "../src/realtime/hub";
import { userNoticeRepository } from "../src/repositories/user-notice.repository";
import type { Db } from "../src/repositories/wallet.repository";
import { readNoticeIdsBody, systemNoticeBody } from "../src/rules/requests/user-notice.request";
import { userNoticeService } from "../src/services/user-notice.service";
import { WALLET_NOTICE, walletNotice } from "../src/utils/user-notice";

const ID = "0190f5c2-7a10-7000-8000-000000000001";

describe("walletNotice (TransactionType -> user notice)", () => {
  it("every transaction type has a notice that fits the columns", () => {
    for (const type of Object.values(TransactionType)) {
      assert.ok(WALLET_NOTICE[type], `missing mapping for ${type}`);
      const n = walletNotice({ type, amount: type.endsWith("CHARGE") || type === "CREDIT_EXPIRED" ? -1500 : 1500, balanceAfter: 2000 });
      assert.ok(n.kind.length <= 40 && n.kind.startsWith("wallet."), n.kind);
      assert.ok(n.title.length > 0 && n.title.length <= 200);
      assert.ok(n.title.includes("1.500 credit"), n.title);
      assert.ok((USER_NOTICE_LEVELS as readonly string[]).includes(n.level));
      assert.equal(n.link, WALLET_NOTICE_LINK);
      assert.match(n.body, /Số dư hiện tại: 2\.000 credit/);
    }
  });

  it("signup bonus reads as money in; admin deduction is not shown as success", () => {
    const signup = walletNotice({ type: "SIGNUP_BONUS", amount: 2000, balanceAfter: 2000 });
    assert.equal(signup.title, "Bạn nhận được 2.000 credit khi đăng ký");
    assert.equal(signup.level, "success");
    assert.equal(signup.kind, "wallet.signup_bonus");
    const minus = walletNotice({ type: "ADMIN_ADJUST", amount: -300, balanceAfter: 0, note: "  sai đơn  " });
    assert.equal(minus.title, "Tài khoản bị trừ 300 credit");
    assert.equal(minus.level, "warning");
    assert.equal(minus.body, "sai đơn\nSố dư hiện tại: 0 credit");
    assert.equal(walletNotice({ type: "EXPLAIN_CHARGE", amount: -10, balanceAfter: 5 }).level, "info");
  });
});

describe("readNoticeIdsBody", () => {
  it("accepts 1..max uuids (lower-cased), rejects empty, too many and non-uuids", () => {
    assert.deepEqual(readNoticeIdsBody.parse({ ids: [ID.toUpperCase()] }), { ids: [ID] });
    assert.equal(readNoticeIdsBody.safeParse({ ids: [] }).success, false);
    assert.equal(readNoticeIdsBody.safeParse({ ids: Array(USER_NOTICE_READ_MAX_IDS + 1).fill(ID) }).success, false);
    assert.equal(readNoticeIdsBody.safeParse({ ids: Array(USER_NOTICE_READ_MAX_IDS).fill(ID) }).success, true);
    assert.equal(readNoticeIdsBody.safeParse({ ids: ["1"] }).success, false);
    assert.equal(readNoticeIdsBody.safeParse({}).success, false);
  });
});

describe("systemNoticeBody", () => {
  it("defaults level to info and keeps internal links only", () => {
    const { key, ...rest } = systemNoticeBody.parse({ title: " Bảo trì " });
    assert.deepEqual(rest, { title: "Bảo trì", level: "info" });
    assert.match(key, /^[0-9a-f-]{36}$/);
    assert.equal(systemNoticeBody.parse({ title: "a", link: "/plan" }).link, "/plan");
    assert.equal(systemNoticeBody.parse({ title: "a", link: "" }).link, undefined);
    for (const link of ["https://evil.com", "//evil.com", "/\\evil.com", "plan", "/a b"]) assert.equal(systemNoticeBody.safeParse({ title: "a", link }).success, false, link);
    assert.equal(systemNoticeBody.safeParse({ title: "" }).success, false);
    assert.equal(systemNoticeBody.safeParse({ title: "x".repeat(201) }).success, false);
    assert.equal(systemNoticeBody.safeParse({ title: "a", body: "x".repeat(501) }).success, false);
    assert.equal(systemNoticeBody.safeParse({ title: "a", level: "error" }).success, false);
  });

  it("key: lower-cases a given uuid, rejects non-uuids, generates a fresh one when absent", () => {
    assert.equal(systemNoticeBody.parse({ title: "a", key: ID.toUpperCase() }).key, ID);
    for (const key of ["", "abc", 123, "x".repeat(36)]) assert.equal(systemNoticeBody.safeParse({ title: "a", key }).success, false, String(key));
    assert.notEqual(systemNoticeBody.parse({ title: "a" }).key, systemNoticeBody.parse({ title: "a" }).key);
  });
});

describe("userNoticeService.broadcast", () => {
  afterEach(() => mock.restoreAll());
  const input = systemNoticeBody.parse({ title: "Bảo trì", key: ID });
  const full = (n: number) => Array.from({ length: n }, (_, i) => `u${String(i).padStart(5, "0")}`);

  it("writes every batch with the key, sums inserted rows and syncs once", async () => {
    const batches = [full(USER_NOTICE_BROADCAST_BATCH), ["last"]];
    const afters: (string | null)[] = [];
    mock.method(userNoticeRepository, "activeUserIds", async (after: string | null) => (afters.push(after), batches.shift() ?? []));
    const create = mock.method(userNoticeRepository, "createForUsers", async (ids: string[]) => (ids.length > 1 ? 3 : 0)); // lô đầu: chỉ 3 người còn thiếu
    const sync = mock.method(realtimeHub, "publishUserNoticeSync", () => {});
    assert.deepEqual(await userNoticeService.broadcast(input), { sent: 3 });
    assert.equal(create.mock.callCount(), 2);
    for (const c of create.mock.calls) assert.equal(c.arguments[2], ID);
    assert.equal(afters[1], `u${String(USER_NOTICE_BROADCAST_BATCH - 1).padStart(5, "0")}`);
    assert.equal(sync.mock.callCount(), 1);
  });

  it("a full retry (nothing inserted) reports 0 and does not sync", async () => {
    mock.method(userNoticeRepository, "activeUserIds", async () => ["a", "b"]);
    mock.method(userNoticeRepository, "createForUsers", async () => 0);
    const sync = mock.method(realtimeHub, "publishUserNoticeSync", () => {});
    assert.deepEqual(await userNoticeService.broadcast(input), { sent: 0 });
    assert.equal(sync.mock.callCount(), 0);
  });
});
describe("userNoticeService.fromLedger", () => {
  const tx = {} as Db; // không có $transaction: giống client trong transaction
  const entry = { userId: ID, type: TransactionType.DEPOSIT, amount: 1000, balanceAfter: 1000 };
  afterEach(() => mock.restoreAll());

  it("a failing notice insert does not throw (wallet transaction keeps going)", async () => {
    mock.method(console, "error", () => {});
    mock.method(userNoticeRepository, "create", async () => {
      throw new Error("Data too long for column 'title'");
    });
    assert.equal(await userNoticeService.fromLedger(tx, entry), null);
  });

  it("rethrows errors that abort the whole transaction (P2034) so callers can retry", async () => {
    const deadlock = new Prisma.PrismaClientKnownRequestError("Write conflict or deadlock", { code: "P2034", clientVersion: Prisma.prismaVersion.client });
    mock.method(userNoticeRepository, "create", async () => {
      throw deadlock;
    });
    await assert.rejects(userNoticeService.fromLedger(tx, entry), deadlock);
  });
});
