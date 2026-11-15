import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { isProd } from "../configs/env";
import { HTTP_STATUS } from "../constants/httpStatus";
import { AppError } from "../rules/error";
import { adminNoticeService } from "../services/admin-notice.service";
import "../configs/zod"; // lời nhắn tiếng Việt mặc định cho mọi schema zod (nạp cùng app lúc khởi động)

export const NOT_FOUND_ROUTE = "Không tìm thấy trang hoặc chức năng này. Hãy kiểm tra lại đường dẫn hoặc tải lại trang.";
export const SERVER_ERROR = "Hệ thống gặp sự cố, không phải do bạn. Vui lòng thử lại sau ít phút; nếu vẫn lỗi hãy liên hệ hỗ trợ và gửi kèm thời gian xảy ra lỗi.";

// Vi phạm unique: chỉ nhận đúng tên ràng buộc đã biết (err.meta.target), còn lại dùng câu chung.
// Chỉ email được gắn vào errors.email vì mọi trang có lỗi này đều có ô email; các mã khác chỉ nằm ở message.
const EMAIL_TAKEN = "Email này đã được sử dụng. Hãy đăng nhập, dùng Quên mật khẩu, hoặc chọn email khác.";
const UNIQUE_MESSAGES: Record<string, string> = {
  users_referral_code_key: "Mã giới thiệu này đã có người dùng. Vui lòng thử lại.",
  gift_codes_code_key: "Mã này đã tồn tại. Hãy chọn mã khác.",
  coursera_courses_code_key: "Mã khóa học này đã tồn tại. Hãy chọn mã khác.",
  coursera_courses_url_key: "Liên kết khóa học này đã có trong hệ thống.",
};
const DUPLICATE = "Thao tác này đã được thực hiện trước đó nên dữ liệu đã tồn tại. Hãy tải lại trang để xem kết quả mới nhất.";

export const uniqueViolation = (meta: Record<string, unknown> | undefined) => {
  const target = meta?.target;
  const name = Array.isArray(target) ? target.join(",") : typeof target === "string" ? target : "";
  if (name === "users_email_key" || name === "email") return { message: EMAIL_TAKEN, errors: { email: EMAIL_TAKEN } };
  return { message: UNIQUE_MESSAGES[name] ?? DUPLICATE };
};

// Lời nhắn chung của lỗi 422: một ô sai thì nói thẳng ô đó, nhiều ô thì đếm (chi tiết từng ô nằm trong errors)
export const validationMessage = (errors: Record<string, string>) => {
  const messages = Object.values(errors);
  return messages.length === 1 ? messages[0]! : `Có ${messages.length} thông tin chưa hợp lệ, xem từng ô bên dưới`;
};

export const notFoundHandler: RequestHandler = (_req, _res, next) => {
  next(AppError.notFound(NOT_FOUND_ROUTE)); // không nhắc lại method/đường dẫn trong lời nhắn
};

// Điểm xử lý lỗi duy nhất: mọi lỗi từ controller/service đều đi qua đây
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    const errors: Record<string, string> = {};
    for (const issue of err.issues) errors[issue.path.join(".") || "_"] ??= issue.message;
    res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({ status: false, message: validationMessage(errors), errors });
    return;
  }

  if (err instanceof AppError) {
    // 429 của service có thời gian chờ: gửi thêm header như bộ giới hạn tốc độ
    const retryAfter = (err.data as { retryAfter?: unknown } | undefined)?.retryAfter;
    if (err.status === HTTP_STATUS.TOO_MANY_REQUESTS && typeof retryAfter === "number") res.setHeader("Retry-After", String(retryAfter));
    res.status(err.status).json({ status: false, message: err.message, errors: err.errors, code: err.code, data: err.data });
    return;
  }

  // Vi phạm unique ở DB (race condition mà bước kiểm tra trước không bắt được)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    res.status(HTTP_STATUS.CONFLICT).json({ status: false, ...uniqueViolation(err.meta) });
    return;
  }

  // Lỗi tải file (multer): file quá lớn là lỗi của người dùng, không phải 500
  if (err?.name === "MulterError") {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Ảnh quá lớn, tối đa 5 MB. Hãy chọn ảnh nhỏ hơn hoặc nén ảnh rồi thử lại."
        : err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE"
          ? "Mỗi lần chỉ tải lên được một tệp. Hãy chọn lại một tệp rồi thử lại."
          : "Không đọc được tệp tải lên. Hãy chọn lại tệp rồi thử lại.";
    res.status(HTTP_STATUS.BAD_REQUEST).json({ status: false, message });
    return;
  }

  // JSON sai cú pháp do body-parser ném ra
  if (err?.type === "entity.parse.failed") {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ status: false, message: "Dữ liệu gửi lên bị lỗi định dạng. Vui lòng tải lại trang rồi thử lại." });
    return;
  }

  // Thân yêu cầu vượt giới hạn của body-parser: lỗi của người dùng, không phải 500
  if (err?.type === "entity.too.large") {
    res.status(HTTP_STATUS.PAYLOAD_TOO_LARGE).json({ status: false, message: "Nội dung gửi lên quá dài. Hãy rút gọn rồi thử lại." });
    return;
  }

  console.error(err);
  adminNoticeService.push("system.error", { title: `Lỗi máy chủ: ${req.method} ${req.path}`, body: String(err?.message ?? err).slice(0, 300), userId: req.user?.id });
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    status: false,
    message: isProd ? SERVER_ERROR : String(err?.message ?? err),
  });
};
