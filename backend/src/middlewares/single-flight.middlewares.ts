import type { RequestHandler } from "express";
import { AppError } from "../rules/error";

/**
 * Mỗi tài khoản chỉ có một yêu cầu đang chạy qua route này; yêu cầu thứ hai bị từ chối 409 (trước multer nên không đọc thân).
 * Khoá nhả khi câu trả lời đóng (xong, lỗi hay khách ngắt). Đặt sau authenticate.
 * shortcut: Set trong bộ nhớ, chỉ đúng với một tiến trình; chạy PM2 cluster nhiều tiến trình thì chuyển sang khoá dùng chung (Redis/DB).
 */
export function onePerUser(message: string): RequestHandler {
  const inFlight = new Set<string>();
  return (req, res, next) => {
    const key = String(req.user!.id);
    if (inFlight.has(key)) throw AppError.conflict(message);
    inFlight.add(key);
    res.once("close", () => inFlight.delete(key));
    next();
  };
}
