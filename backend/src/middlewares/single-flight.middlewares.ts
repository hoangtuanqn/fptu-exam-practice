import type { RequestHandler } from "express";
import { HTTP_STATUS } from "../constants/httpStatus";
import { examUploadQueue } from "../jobs/exam-upload.queue";
import { AppError } from "../rules/error";
import { UPLOAD_QUEUE_FULL_MESSAGE } from "../utils/upload-queue";

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

// Admin tải đề bằng tay (tạo đề và cập nhật ảnh dùng CHUNG một khoá): mỗi admin một lần tải đang chạy, không giữ nhiều thân 300 MB trong RAM
export const oneExamUploadPerAdmin = onePerUser("Bạn đang có một lần tải đề khác, hãy đợi nó xong rồi gửi tiếp.");

// Tải đề chạy nền (?async=1): hàng đợi đầy thì từ chối 429 trước multer (không đọc thân lớn chỉ để từ chối). Lúc ghi tệp tạm còn kiểm tra lại theo dung lượng thật.
export const examUploadQueueRoom: RequestHandler = (req, _res, next) => {
  if (req.query.async === "1" && examUploadQueue.isFull()) throw new AppError(UPLOAD_QUEUE_FULL_MESSAGE, HTTP_STATUS.TOO_MANY_REQUESTS);
  next();
};
