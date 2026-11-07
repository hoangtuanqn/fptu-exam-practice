import { http } from "@/shared/api/client";

// Tình trạng điểm danh hôm nay (ngày tính theo giờ Việt Nam, đổi ngày lúc 0h)
export interface CheckInStatus {
  canClaim: boolean; // còn nhận được hôm nay
  claimedToday: boolean;
  needVerify: boolean; // chưa xác minh email nên chưa nhận được
  streak: number; // số ngày liên tiếp đã điểm danh
  cycleDay: number; // hôm nay là ngày thứ mấy (1..days) trong vòng
  completedDays: number; // số ngày của vòng đã nhận
  days: number; // độ dài vòng (7)
  dailyAmount: number; // credit mỗi ngày
  bonus: number; // thưởng thêm ở ngày cuối vòng
  todayAmount: number; // credit nhận được hôm nay
}

export interface CheckInResult {
  amount: number;
  bonus: number;
  streak: number;
  cycleDay: number;
  completedDays: number;
  balanceAfter: number;
}

export const checkInApi = {
  status: () => http.get<CheckInStatus>("/check-in"),
  claim: () => http.post<CheckInResult>("/check-in/claim"),
};
