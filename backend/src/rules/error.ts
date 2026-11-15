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

  static paymentRequired(message = "Số dư credit không đủ. Vui lòng nạp thêm credit rồi thử lại.") {
    return new AppError(message, HTTP_STATUS.PAYMENT_REQUIRED);
  }
  static unauthorized(message = "Bạn chưa đăng nhập hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.") {
    return new AppError(message, HTTP_STATUS.UNAUTHORIZED);
  }
  static forbidden(message = "Bạn không có quyền thực hiện thao tác này") {
    return new AppError(message, HTTP_STATUS.FORBIDDEN);
  }
  static notFound(message = "Không tìm thấy dữ liệu này, có thể nó đã bị xoá. Hãy tải lại trang rồi thử lại.") {
    return new AppError(message, HTTP_STATUS.NOT_FOUND);
  }
  // Tài khoản bị admin khoá: dùng chung cho đăng nhập, đăng nhập mạng xã hội và mọi request đã có token
  static banned() {
    return new AppError("Tài khoản này đã bị khoá. Nếu bạn nghĩ đây là nhầm lẫn, hãy liên hệ hỗ trợ và gửi kèm email đăng ký.", HTTP_STATUS.FORBIDDEN, undefined, "ACCOUNT_BANNED");
  }
  static conflict(message: string, errors?: Record<string, string>) {
    return new AppError(message, HTTP_STATUS.CONFLICT, errors);
  }
}
