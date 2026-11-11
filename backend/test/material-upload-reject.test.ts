import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import express, { type RequestHandler } from "express";
import { MATERIAL_UPLOADS_PER_HOUR } from "../src/constants/materials";
import { errorHandler } from "../src/middlewares/error.middlewares";
import { AppError } from "../src/rules/error";
import { createMaterialRouter } from "../src/routes/material.routes";
import { buildPdf } from "./helpers/pdf";

// Yêu cầu tải lên bị từ chối TRƯỚC khi multer đọc tệp (401, 403, 429) phải trả đúng JSON qua socket thật.
// Trước đây Node trả lời sớm rồi đóng kết nối khi thân yêu cầu chưa đọc hết: Nginx đang gửi thân thì gặp EPIPE và trả 502.

const BODY_BYTES = 1024 * 1024;

// Xác thực giả như authenticate thật: không có danh tính thì ném 401, có thì gắn req.user ("pro" = id 1)
const fakeAuth: RequestHandler = async (req, _res, next) => {
  const who = req.header("x-test-user");
  if (!who) throw AppError.unauthorized();
  req.user = { id: who === "pro" ? 1 : 2, role: "USER" } as unknown as NonNullable<typeof req.user>;
  next();
};

const ok: RequestHandler = (_req, res) => void res.json({ status: true, message: "ok" });
const controller = {
  quota: ok,
  list: ok,
  detail: ok,
  remove: ok,
  gate: (async (req, _res, next) => {
    if ((req.user as unknown as { id: number }).id !== 1) throw AppError.forbidden("Phân tích slide chỉ dành cho tài khoản Pro.");
    next();
  }) as RequestHandler,
  create: ((req, res) => void res.status(202).json({ status: true, message: "Đã nhận", data: { size: req.file?.size ?? 0 } })) as RequestHandler,
};

/** multipart với field subjectCode và một tệp PDF đệm tới `bytes` byte. */
function multipart(bytes: number) {
  const boundary = "----fepassTestBoundary";
  const pdf = Buffer.concat([buildPdf([{ text: "Slide text long enough for the test" }]), Buffer.alloc(Math.max(0, bytes), 0x20)]);
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="subjectCode"\r\n\r\nOSG202\r\n` +
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="deck.pdf"\r\nContent-Type: application/pdf\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  return { body: Buffer.concat([head, pdf, tail]), type: `multipart/form-data; boundary=${boundary}` };
}

interface Reply {
  status: number;
  json: { status: boolean; message: string };
}

/** POST qua socket thật, ghi thân theo từng mảnh như proxy; lỗi socket (ECONNRESET/EPIPE) làm promise bị từ chối. */
function post(port: number, user: string | null, bytes = BODY_BYTES): Promise<Reply> {
  const { body, type } = multipart(bytes);
  return new Promise((resolve, reject) => {
    const req = http.request(
      { host: "127.0.0.1", port, path: "/api/v1/materials", method: "POST", agent: false, headers: { "content-type": type, "content-length": body.length, ...(user && { "x-test-user": user }) } },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode ?? 0, json: JSON.parse(Buffer.concat(chunks).toString("utf8")) });
          } catch (err) {
            reject(err);
          }
        });
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    const CHUNK = 64 * 1024;
    let offset = 0;
    const pump = () => {
      while (offset < body.length) {
        const part = body.subarray(offset, offset + CHUNK);
        offset += part.length;
        if (!req.write(part)) return void req.once("drain", pump);
      }
      req.end();
    };
    pump();
  });
}

describe("materials upload: early rejections over a real socket", () => {
  let server: http.Server;
  let port = 0;

  before(async () => {
    const app = express();
    app.use("/api/v1/materials", createMaterialRouter({ authenticate: fakeAuth, controller }));
    app.use(errorHandler);
    server = http.createServer(app);
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    port = (server.address() as AddressInfo).port;
  });

  after(() => new Promise<void>((r) => server.close(() => r())));

  it("401 when not signed in: JSON reply, no connection reset", async () => {
    const r = await post(port, null);
    assert.equal(r.status, 401);
    assert.equal(r.json.status, false);
    assert.match(r.json.message, /đăng nhập/);
  });

  it("403 for a non-Pro account (gate before multer)", async () => {
    const r = await post(port, "free");
    assert.equal(r.status, 403);
    assert.match(r.json.message, /Pro/);
  });

  it("accepted uploads still work, then the hourly limiter answers 429 cleanly", async () => {
    for (let i = 0; i < MATERIAL_UPLOADS_PER_HOUR; i++) {
      const r = await post(port, "pro");
      assert.equal(r.status, 202);
      assert.ok((r.json as unknown as { data: { size: number } }).data.size > BODY_BYTES);
    }
    const limited = await post(port, "pro");
    assert.equal(limited.status, 429);
    assert.match(limited.json.message, /nhiều tài liệu/);
  });
});
