import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import express from "express";
import { errorHandler } from "../src/middlewares/error.middlewares";
import { onePerUser } from "../src/middlewares/single-flight.middlewares";

// Lần gửi thứ hai của cùng tài khoản khi lần đầu chưa xong: 409; tài khoản khác không bị ảnh hưởng; xong thì nhả khoá
describe("onePerUser in-flight guard", () => {
  let server: http.Server;
  let port = 0;
  const pending: Array<() => void> = [];

  before(async () => {
    const app = express();
    app.use((req, _res, next) => {
      req.user = { id: req.header("x-user") } as unknown as NonNullable<typeof req.user>;
      next();
    });
    app.post("/", onePerUser("busy"), (_req, res) => void pending.push(() => res.json({ ok: true })));
    app.use(errorHandler);
    server = http.createServer(app);
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    port = (server.address() as AddressInfo).port;
  });

  after(() => new Promise<void>((r) => server.close(() => r())));

  const post = (user: string) => fetch(`http://127.0.0.1:${port}/`, { method: "POST", headers: { "x-user": user } });
  const waitPending = async (n: number) => {
    while (pending.length < n) await new Promise((r) => setTimeout(r, 5));
  };

  it("rejects a parallel upload from the same user and releases the lock afterwards", async () => {
    const first = post("a");
    await waitPending(1);
    assert.equal((await post("a")).status, 409);

    const other = post("b");
    await waitPending(2);
    pending.splice(0).forEach((finish) => finish());
    assert.equal((await first).status, 200);
    assert.equal((await other).status, 200);

    const again = post("a");
    await waitPending(1);
    pending.splice(0).forEach((finish) => finish());
    assert.equal((await again).status, 200);
  });
});
