import { HTTP_STATUS } from "../constants/httpStatus";

// Lỗi nghiệp vụ: service ném ra, error middleware biến thành response
export class AppError extends Error {
  constructor(
    message: string,
    public status: number = HTTP_STATUS.BAD_REQUEST,
    public errors?: Record<string, string>,
  ) {
    super(message);
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
