import assert from "node:assert/strict";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { describe, it } from "node:test";
import { env } from "../src/configs/env";
import { authenticate, identify } from "../src/middlewares/auth.middlewares";
import { listWalletQuery } from "../src/rules/requests/admin-history.request";
import { uuidParam } from "../src/rules/requests/admin.request";
import { listDepositsQuery } from "../src/rules/requests/deposit.request";
import { signImpersonationToken, signToken, verifyToken } from "../src/utils/jwt";

// User ids are UUID v7 strings since migration 0080.
const USER = "0190f5a2-1c3b-7000-8001-0123456789ab";
const ADMIN = "0190f5a2-1c3b-7000-8002-0123456789ab";

const statusOf = (fn: () => unknown) => {
  try {
    fn();
  } catch (err) {
    return (err as { status?: number }).status;
  }
  return 200;
};

const runMiddleware = async (mw: typeof authenticate, authorization: string) => {
  const req = { headers: { authorization }, header: () => undefined } as unknown as Request;
  try {
    await mw(req, {} as Response, (() => undefined) as NextFunction);
    return 200;
  } catch (err) {
    return (err as { status?: number }).status;
  }
};

describe("JWT subject (user id)", () => {
  it("round-trips a UUID subject, for normal and impersonation tokens", () => {
    assert.equal(verifyToken(signToken(USER)).sub, USER);
    assert.equal(verifyToken(signImpersonationToken(USER, ADMIN)).sub, USER);
  });
  it("rejects a token issued before migration 0080 (numeric subject) with 401, not 500", () => {
    const old = jwt.sign({ sub: "42" }, env.JWT_SECRET, { expiresIn: "15m" });
    assert.equal(statusOf(() => verifyToken(old)), 401);
    assert.equal(statusOf(() => verifyToken(jwt.sign({ sub: "42", imp: 1 }, env.JWT_SECRET))), 401);
    assert.equal(statusOf(() => verifyToken(jwt.sign({}, env.JWT_SECRET))), 401);
    assert.equal(statusOf(() => verifyToken(jwt.sign("raw-string", env.JWT_SECRET))), 401);
  });
  it("auth middlewares answer 401 for an old token before touching the database", async () => {
    const old = `Bearer ${jwt.sign({ sub: "42" }, env.JWT_SECRET)}`;
    assert.equal(await runMiddleware(authenticate, old), 401);
    assert.equal(await runMiddleware(identify, old), 401);
  });
});

describe("user id params and filters", () => {
  it("accept only UUIDs (lower-cased like the stored value)", () => {
    assert.deepEqual(uuidParam.parse({ id: USER.toUpperCase() }), { id: USER });
    assert.equal(uuidParam.safeParse({ id: "42" }).success, false);
    assert.equal(listDepositsQuery.safeParse({ userId: "42" }).success, false);
    assert.equal(listDepositsQuery.parse({ userId: USER }).userId, USER);
    assert.equal(listWalletQuery.safeParse({ userId: "7" }).success, false);
  });
});
