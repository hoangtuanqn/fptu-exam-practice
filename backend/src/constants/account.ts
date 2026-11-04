// Cấu hình chung của tài khoản (admin chỉnh ở trang Cấu hình tài khoản, lưu trong bảng settings với tiền tố "account.")
export interface AccountConfig {
  signupCredit: number; // credit tặng mọi tài khoản mới khi đăng ký (0 = không tặng)
}

export const ACCOUNT_DEFAULTS: AccountConfig = {
  signupCredit: 0,
};

export const ACCOUNT_KEY_PREFIX = "account.";
