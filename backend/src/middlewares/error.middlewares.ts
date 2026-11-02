import { Prisma } from "@prisma/client";
import type { ErrorRequestHandler, RequestHandler } from "express";
import { ZodError } from "zod";
import { isProd } from "../configs/env";
import { HTTP_STATUS } from "../constants/httpStatus";
import { AppError } from "../rules/error";

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Không tìm thấy ${req.method} ${req.originalUrl}`));
};

// Điểm xử lý lỗi duy nhất: mọi lỗi từ controller/service đều đi qua đây
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    const errors: Record<string, string> = {};
    for (const issue of err.issues) errors[issue.path.join(".") || "_"] ??= issue.message;
    res.status(HTTP_STATUS.UNPROCESSABLE_ENTITY).json({ status: false, message: "Dữ liệu không hợp lệ", errors });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.status).json({ status: false, message: err.message, errors: err.errors });
    return;
  }

  // Vi phạm unique ở DB (race condition mà bước kiểm tra trước không bắt được)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    res.status(HTTP_STATUS.CONFLICT).json({ status: false, message: "Dữ liệu đã tồn tại" });
    return;
  }

  // JSON sai cú pháp do body-parser ném ra
  if (err?.type === "entity.parse.failed") {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ status: false, message: "Body không phải JSON hợp lệ" });
    return;
  }

  console.error(err);
  res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
    status: false,
    message: isProd ? "Đã có lỗi xảy ra" : String(err?.message ?? err),
  });
};
