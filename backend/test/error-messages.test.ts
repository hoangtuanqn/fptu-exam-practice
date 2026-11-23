import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import express, { type ErrorRequestHandler, type RequestHandler } from "express";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { errorHandler, notFoundHandler, NOT_FOUND_ROUTE } from "../src/middlewares/error.middlewares";
import { makeLimiter } from "../src/middlewares/rateLimit.middlewares";
import { validate } from "../src/middlewares/validate.middlewares";
import { registerBody } from "../src/rules/requests/auth.request";
import { AppError } from "../src/rules/error";
import { userRepository } from "../src/repositories/user.repository";
import { captchaService } from "../src/services/captcha.service";
import { authService, INVALID_LOGIN } from "../src/services/auth.service";
import { waitText } from "../src/utils/format";
import { hashPassword } from "../src/utils/password";

// Lời nhắn lỗi người dùng thấy: cụ thể, tiếng Việt, có cách xử lý; mã trạng thái và code/errors giữ nguyên.

const ENGLISH = /\b(Invalid|Expected|Required|String must|must contain|Too many|Not Found|Unique constraint)\b/i;

interface Reply {
  status: number;
  headers: Headers;
  json: { status: boolean; message: string; code?: string; errors?: Record<string, string>; data?: { retryAfter?: number } };
}

let base = "";
let server: ReturnType<express.Express["listen"]>;

const call = async (path: string, init?: RequestInit): Promise<Reply> => {
  const res = await fetch(base + path, init);
  return { status: res.status, headers: res.headers, json: (await res.json()) as Reply["json"] };
};
const postJson = (path: string, body: unknown) => call(path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

const throwing =
  (err: unknown): RequestHandler =>
  () => {
    throw err;
  };

before(async () => {
  const app = express();
  app.use(express.json());
  const loginLike = makeLimiter({ windowMs: 12 * 60 * 1000, limit: 1, message: "Bạn đã thử đăng nhập quá nhiều lần từ mạng này." });
  const byPath = makeLimiter({ limit: 1, message: (req) => `Có quá nhiều lượt ${req.path === "/register" ? "đăng ký tài khoản" : "thao tác"} từ mạng bạn đang dùng.` });
  app.post("/login", loginLike, (_req, res) => void res.json({ status: true }));
  app.post("/register", byPath, (_req, res) => void res.json({ status: true }));
  app.post("/one", validate(z.object({ title: z.string().min(3) })), (_req, res) => void res.json({ status: true }));
  app.post("/register-body", validate(registerBody), (_req, res) => void res.json({ status: true }));
  const p2002 = (target: unknown) => new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "test", meta: { target } });
  app.get("/dup-email", throwing(p2002("users_email_key")));
  app.get("/dup-code", throwing(p2002("gift_codes_code_key")));
  app.get("/dup-other", throwing(p2002("user_exams_user_id_exam_id_key")));
  app.get("/dup-subject-code", throwing(p2002("subject_code")));
  app.get("/dup-code-array", throwing(p2002(["subjectCode", "kind"])));
  app.get("/dup-deposit-code", throwing(p2002("deposit_orders_code_key")));
  app.get("/cooldown", throwing(new AppError("Đợi 30 giây rồi gửi lại.", 429, undefined, undefined, { retryAfter: 30 })));
  app.use(notFoundHandler);
  app.use(errorHandler as ErrorRequestHandler);
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => new Promise<void>((r) => server.close(() => r())));

describe("rate limit messages", () => {
  it("say the action, the real wait time and send Retry-After, without the limit numbers", async () => {
    assert.equal((await postJson("/login", {})).status, 200);
    const r = await postJson("/login", {});
    assert.equal(r.status, 429);
    assert.equal(r.json.status, false);
    assert.equal(r.json.code, "RATE_LIMITED");
    assert.match(r.json.message, /^Bạn đã thử đăng nhập quá nhiều lần từ mạng này\. Vui lòng thử lại sau 12 phút\.$/);
    const retry = Number(r.headers.get("retry-after"));
    assert.ok(retry > 11 * 60 && retry <= 12 * 60, `Retry-After=${retry}`);
    assert.equal(r.json.data?.retryAfter, retry);
  });

  it("can name the action from the request path", async () => {
    await postJson("/register", {});
    const r = await postJson("/register", {});
    assert.equal(r.status, 429);
    assert.match(r.json.message, /lượt đăng ký tài khoản .* Vui lòng thử lại sau (\d+ giây|1 phút)\.$/);
  });

  it("waitText reads naturally", () => {
    assert.equal(waitText(400), "1 giây");
    assert.equal(waitText(45_000), "45 giây");
    assert.equal(waitText(11 * 60_000 + 1), "12 phút");
    assert.equal(waitText(60 * 60_000), "1 giờ");
    assert.equal(waitText(125 * 60_000), "2 giờ 5 phút");
  });
});

describe("validation (422)", () => {
  it("uses the only field error as the top-level message", async () => {
    const r = await postJson("/one", { title: "ab" });
    assert.equal(r.status, 422);
    assert.equal(r.json.message, "Tiêu đề cần ít nhất 3 ký tự");
    assert.deepEqual(r.json.errors, { title: "Tiêu đề cần ít nhất 3 ký tự" });
  });

  it("counts several field errors and keeps the errors map", async () => {
    const r = await postJson("/register-body", { email: "not-an-email", fullName: "A", password: "short" });
    assert.equal(r.status, 422);
    assert.equal(r.json.message, "Có 3 thông tin chưa hợp lệ, xem từng ô bên dưới");
    assert.deepEqual(Object.keys(r.json.errors!).sort(), ["email", "fullName", "password"]);
    assert.equal(r.json.errors!.password, "Mật khẩu cần ít nhất 8 ký tự");
  });

  it("translates zod defaults into Vietnamese with the field name", () => {
    const schema = z.object({
      email: z.string().email(),
      fullName: z.string().min(2),
      amount: z.number().int().max(10),
      url: z.string().url(),
      mode: z.enum(["PRACTICE", "EXAM"]),
      code: z.string().uuid(),
      note: z.string().max(3),
      password: z.string(),
    });
    const issues = schema.safeParse({ email: "x", fullName: "a", amount: 1.5, url: "abc", mode: "X", code: "1", note: "abcd" }).error!.issues;
    const by = Object.fromEntries(issues.map((i) => [i.path.join("."), i.message]));
    assert.equal(by.email, "Email không đúng định dạng, ví dụ: ten@gmail.com");
    assert.equal(by.fullName, "Họ tên cần ít nhất 2 ký tự");
    assert.equal(by.amount, "Số tiền phải là số nguyên");
    assert.match(by.url!, /^Liên kết phải là một đường link hợp lệ/);
    assert.match(by.mode!, /^Chế độ làm bài không nằm trong các lựa chọn/);
    assert.equal(by.code, "Mã không đúng định dạng");
    assert.equal(by.note, "Ghi chú tối đa 3 ký tự, hãy rút gọn lại");
    assert.equal(by.password, "Vui lòng nhập mật khẩu");
    for (const m of Object.values(by)) assert.doesNotMatch(m, ENGLISH);
  });
});

describe("generic fallbacks", () => {
  it("404 does not echo method or path", async () => {
    const r = await call("/api/v1/secret/path?x=1");
    assert.equal(r.status, 404);
    assert.equal(r.json.message, NOT_FOUND_ROUTE);
    assert.doesNotMatch(r.json.message, /GET|\/api/);
  });

  it("P2002 says what already exists when the target is known, generic otherwise", async () => {
    const email = await call("/dup-email");
    assert.equal(email.status, 409);
    assert.match(email.json.message, /^Email này đã được sử dụng/);
    assert.equal(email.json.errors?.email, email.json.message);
    const code = await call("/dup-code");
    assert.equal(code.json.message, "Mã này đã tồn tại. Hãy chọn mã khác.");
    assert.equal(code.json.errors, undefined); // chỉ email được gắn vào errors
    const other = await call("/dup-other");
    assert.equal(other.status, 409);
    assert.match(other.json.message, /đã tồn tại.*tải lại trang/);
    assert.equal(other.json.errors, undefined);
    // Tên chứa "code" nhưng không phải ràng buộc đã biết: câu chung
    for (const path of ["/dup-subject-code", "/dup-code-array", "/dup-deposit-code"]) {
      const r = await call(path);
      assert.equal(r.json.message, other.json.message, path);
      assert.equal(r.json.errors, undefined, path);
    }
  });

  it("an AppError 429 with data.retryAfter also sends the Retry-After header", async () => {
    const r = await call("/cooldown");
    assert.equal(r.status, 429);
    assert.equal(r.headers.get("retry-after"), "30");
    assert.equal(r.json.data?.retryAfter, 30);
  });
});

describe("login failures", () => {
  const original = { find: userRepository.findByEmailWithPassword, findById: userRepository.findById, captcha: captchaService.assert };
  let account: { id: number; email: string; password: string; status: string } | null = null;

  before(async () => {
    // Không chạm DB hay Cloudflare: thay hai hàm đọc user và bước captcha bằng bản giả
    (userRepository as { findByEmailWithPassword: unknown }).findByEmailWithPassword = async () => account;
    (userRepository as { findById: unknown }).findById = async () => account;
    captchaService.assert = async () => {};
    account = { id: 1, email: "a@b.c", password: await hashPassword("right-pass1"), status: "BANNED" };
  });
  after(() => {
    (userRepository as { findByEmailWithPassword: unknown }).findByEmailWithPassword = original.find;
    (userRepository as { findById: unknown }).findById = original.findById;
    captchaService.assert = original.captcha;
  });

  const fail = async (email: string, password: string, ip: string) => {
    try {
      await authService.login({ email, password }, ip);
    } catch (err) {
      assert.ok(err instanceof AppError);
      return err;
    }
    assert.fail("login should have failed");
  };

  it("wrong email or password: same 401 message with a way out, captcha after a few tries, then a timed lock", async () => {
    const first = await fail("nobody@x.y", "whatever1", "10.0.0.1");
    assert.equal(first.status, 401);
    assert.equal(first.code, "INVALID_CREDENTIALS");
    assert.equal(first.message, INVALID_LOGIN);
    assert.match(first.message, /Quên mật khẩu/);
    assert.equal(first.errors, undefined);

    const wrongPass = await fail("a@b.c", "wrong-pass1", "10.0.0.2");
    assert.equal(wrongPass.message, first.message); // không lộ email nào tồn tại

    await fail("nobody@x.y", "whatever1", "10.0.0.1");
    const third = await fail("nobody@x.y", "whatever1", "10.0.0.1");
    assert.equal(third.errors?.captcha, INVALID_LOGIN); // giao diện dựa vào errors.captcha để hiện captcha

    for (let i = 0; i < 4; i++) await fail("nobody@x.y", "whatever1", "10.0.0.1");
    const locked = await fail("nobody@x.y", "whatever1", "10.0.0.1");
    assert.equal(locked.status, 429);
    assert.equal(locked.code, "LOGIN_LOCKED");
    assert.match(locked.message, /tạm khoá .* thử lại sau 15 phút/);
    const retryAfter = (locked.data as { retryAfter: number }).retryAfter;
    assert.ok(retryAfter > 14 * 60 && retryAfter <= 15 * 60, `retryAfter=${retryAfter}`);
  });

  it("banned account: 403 that says to contact support", async () => {
    const banned = await fail("a@b.c", "right-pass1", "10.0.0.3");
    assert.equal(banned.status, 403);
    assert.equal(banned.code, "ACCOUNT_BANNED");
    assert.match(banned.message, /đã bị khoá.*liên hệ hỗ trợ/);
  });
});

