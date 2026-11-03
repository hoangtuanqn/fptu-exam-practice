// Cấu hình chương trình giới thiệu (admin chỉnh ở trang Giới thiệu, lưu trong bảng settings với tiền tố "referral.")
export interface ReferralConfig {
  enabled: boolean; // tắt thì đăng ký qua mã vẫn được nhưng không ai nhận thưởng
  signupBonus: number; // credit người MỚI nhận khi đăng ký qua mã giới thiệu
  referrerSignupBonus: number; // credit người GIỚI THIỆU nhận khi có người đăng ký (0 = không tặng)
  commissionPercent: number; // % số tiền người được giới thiệu nạp, trả cho người giới thiệu mỗi lần nạp
}

export const REFERRAL_DEFAULTS: ReferralConfig = {
  enabled: true,
  signupBonus: 100,
  referrerSignupBonus: 0,
  commissionPercent: 20,
};

export const REFERRAL_KEY_PREFIX = "referral.";

// Mã giới thiệu: bỏ các ký tự dễ nhầm (0/O, 1/I)
export const REFERRAL_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const REFERRAL_CODE_LENGTH = 8;
