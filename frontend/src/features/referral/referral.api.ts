import { http } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";
import type { ReferralOverview } from "@/shared/types/api";

const KEY = "referral_code";

// Mã giới thiệu từ liên kết ?ref=...: nhớ lại để người dùng đi vòng qua trang khác rồi mới đăng ký vẫn được tính
export const referralCodeStore = {
  get: () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  },
  set: (code: string) => {
    try {
      localStorage.setItem(KEY, code);
    } catch {
      /* bỏ qua: trình duyệt chặn lưu trữ */
    }
  },
  clear: () => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* bỏ qua */
    }
  },
};

export const referralApi = {
  // Trang cá nhân: mã, thống kê và danh sách người đã giới thiệu (phân trang trên server)
  me: (page = 1) => http.get<ReferralOverview>("/referrals/me", { page, limit: PAGE_SIZE }),
  // Không cần đăng nhập: mã trên liên kết có hợp lệ không
  publicInfo: (code: string) => http.get<{ valid: boolean; bonus: number }>(`/public/referrals/${encodeURIComponent(code)}`),
};
