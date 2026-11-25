// Cấu hình chung của tài khoản (admin chỉnh ở trang Cấu hình tài khoản, lưu trong bảng settings với tiền tố "account.")
export interface AccountConfig {
  signupCredit: number; // credit tặng mọi tài khoản mới khi đăng ký (0 = không tặng)
}

export const ACCOUNT_DEFAULTS: AccountConfig = {
  signupCredit: 0,
};

export const ACCOUNT_KEY_PREFIX = "account.";

// Tự xoá tài khoản: chờ chừng này ngày (đăng nhập lại là huỷ) rồi mới ẩn danh
export const DELETION_GRACE_DAYS = 14;
export const DELETION_MAX_PER_RUN = 200;
export const DELETED_ACCOUNT_NAME = "Tài khoản đã xóa";
