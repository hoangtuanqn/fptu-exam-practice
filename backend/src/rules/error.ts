import { HTTP_STATUS } from "../constants/httpStatus";

// Lỗi nghiệp vụ: service ném ra, error middleware biến thành response
export class AppError extends Error {
  constructor(
    message: string,
    public status: number = HTTP_STATUS.BAD_REQUEST,
    public errors?: Record<string, string>,
    public code?: string, // mã máy đọc được để frontend nhận diện lỗi (ví dụ CHAT_QUOTA_EXCEEDED)
    public data?: unknown, // dữ liệu kèm theo lỗi (ví dụ hạn mức còn lại)
  ) {
    super(message);
  }

  static paymentRequired(message = "Số dư không đủ") {
    return new AppError(message, HTTP_STATUS.PAYMENT_REQUIRED);
  }
  static unauthorized(message = "Chưa đăng nhập hoặc phiên đã hết hạn") {
    return new AppError(message, HTTP_STATUS.UNAUTHORIZED);
  }
  static forbidden(message = "Bạn không có quyền thực hiện thao tác này") {
    return new AppError(message, HTTP_STATUS.FORBIDDEN);
  }
  static notFound(message = "Không tìm thấy dữ liệu") {
    return new AppError(message, HTTP_STATUS.NOT_FOUND);
  }
  static conflict(message: string, errors?: Record<string, string>) {
    return new AppError(message, HTTP_STATUS.CONFLICT, errors);
  }
}
