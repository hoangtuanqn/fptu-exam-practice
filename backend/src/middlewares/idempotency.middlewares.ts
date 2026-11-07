import { createHash } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

/**
 * Chống làm một việc hai lần (trừ tiền, tạo lệnh nạp) khi người dùng bấm đúp, mạng chập chờn rồi gửi lại.
 * Cùng người + cùng đường dẫn + cùng "khóa" thì chỉ chạy MỘT lần; lần gửi lại trong thời hạn nhận về đúng kết quả lần đầu
 * (kèm header `Idempotent-Replay: true`), kể cả khi lần đầu còn đang chạy.
 * Khóa lấy từ header `Idempotency-Key` nếu client gửi (giữ 10 phút); không có thì dùng dấu vân tay nội dung yêu cầu (giữ 10 giây).
 * Chỉ lưu kết quả thành công và lỗi do người dùng (4xx); lỗi 5xx không lưu để thử lại được.
 * Bộ nhớ trong tiến trình: đúng khi chạy một tiến trình (PM2 fork, instances: 1 như deploy hiện tại).
 */
interface Entry {
  expires: number;
  done: Promise<{ status: number; body: unknown } | null>;
}
const store = new Map<string, Entry>();
const KEY_TTL_MS = 10 * 60_000;
const BODY_TTL_MS = 10_000;

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of store) if (v.expires < now) store.delete(k);
}, 60_000).unref();

export function idempotent(req: Request, res: Response, next: NextFunction) {
  const who = req.user ? `u${req.user.id}` : `g${req.guestId ?? req.ip}`;
  const header = req.header("idempotency-key")?.slice(0, 80);
  const raw = header ?? createHash("sha1").update(JSON.stringify(req.body ?? {})).digest("hex");
  const key = `${who}|${req.method}|${req.baseUrl}${req.path}|${raw}`;
  const ttl = header ? KEY_TTL_MS : BODY_TTL_MS;

  const existing = store.get(key);
  if (existing && existing.expires > Date.now()) {
    void existing.done.then((saved) => {
      if (!saved) return next(); // lần trước lỗi hệ thống: cho chạy lại
      res.setHeader("Idempotent-Replay", "true");
      res.status(saved.status).json(saved.body);
    });
    return;
  }

  let resolve!: (v: { status: number; body: unknown } | null) => void;
  const done = new Promise<{ status: number; body: unknown } | null>((r) => (resolve = r));
  store.set(key, { expires: Date.now() + ttl, done });

  const json = res.json.bind(res);
  res.json = (body: unknown) => {
    resolve(res.statusCode < 500 ? { status: res.statusCode, body } : null);
    if (res.statusCode >= 500) store.delete(key);
    return json(body);
  };
  res.on("close", () => resolve(null)); // đóng kết nối mà chưa trả lời: các yêu cầu đang chờ được chạy lại
  next();
}
