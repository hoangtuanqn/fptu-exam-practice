import type { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import type { Options } from "express-rate-limit";
import { REQUEST_DRAIN_TIMEOUT_MS } from "../constants/materials";

// Trả lời sớm (401/403/429...) một yêu cầu có thân lớn mà chưa đọc hết thân: Node đóng kết nối sau khi trả lời,
// proxy (Nginx) đang gửi phần thân còn lại thì gặp EPIPE và trả 502 thay cho lời báo lỗi.
// Các hàm ở đây đọc BỎ phần thân còn lại (không giữ trong bộ nhớ) rồi mới để câu trả lời đi ra. Dùng cho route nhận tệp.

const fullyRead = (req: Request) => req.readableEnded || req.complete || req.destroyed;

/** Đọc bỏ phần thân chưa đọc của yêu cầu; xong (hoặc lỗi, đóng, quá thời gian) thì resolve. Không bao giờ reject. */
export function drainRequest(req: Request, timeoutMs = REQUEST_DRAIN_TIMEOUT_MS): Promise<void> {
  if (fullyRead(req)) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      req.off("end", done).off("error", done).off("close", done);
      resolve();
    };
    const timer = setTimeout(done, timeoutMs);
    req.on("end", done).on("error", done).on("close", done);
    req.resume(); // chảy hết dữ liệu, không ai giữ lại
  });
}

/** Middleware lỗi đặt cuối router: đọc bỏ thân rồi chuyển lỗi cho errorHandler chung (giữ nguyên mã và lời nhắn). */
export const drainBeforeError: ErrorRequestHandler = (err, req, _res, next) => {
  void drainRequest(req).then(() => next(err));
};

/** handler cho express-rate-limit: giống handler mặc định (statusCode + message) nhưng đọc bỏ thân trước khi trả lời. */
export const drainingLimitHandler = (req: Request, res: Response, _next: NextFunction, options: Options) => {
  void drainRequest(req).then(() => {
    if (!res.headersSent) res.status(options.statusCode).send(options.message);
  });
};
