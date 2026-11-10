import { http } from "@/shared/api/client";

/** Lượt giải thích AI miễn phí của tài khoản (nhận từ vượt link, hết hạn sau vài ngày) */
export interface FreeTurnStatus {
  enabled: boolean; // còn tạo được link vượt link mới (lượt đã có vẫn dùng được kể cả khi tắt)
  available: number; // số lượt còn dùng được
  nextExpiresAt: string | null; // lượt sắp hết hạn nhất
  expiringSoon: number; // số lượt còn dưới 48 giờ
  expiredRecently: number; // số lượt vừa hết hạn (3 ngày qua) mà chưa dùng
  claimedToday: number;
  dailyLimit: number;
  remainingToday: number; // hôm nay còn nhận thêm được mấy lần
  rewardTurns: number; // lần vượt link tới được bao nhiêu lượt
  validDays: number;
}

export interface ClaimResult extends FreeTurnStatus {
  granted: boolean; // vừa cộng lượt
  turns: number; // số lượt vừa cộng
  already: boolean; // liên kết này đã nhận trước đó
}

export const linkRewardApi = {
  status: () => http.get<FreeTurnStatus>("/link-rewards/status"),
  start: () => http.post<{ shortUrl: string; expiresAt: string }>("/link-rewards/start"),
  claim: (token: string) => http.post<ClaimResult>("/link-rewards/claim", { token }),
};
