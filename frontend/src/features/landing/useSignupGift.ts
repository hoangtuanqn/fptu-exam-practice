import { authApi } from "@/features/auth/auth.api";
import { examApi } from "@/features/exam/exam.api";
import { useApi } from "@/shared/hooks/useApi";

export const GIFT_EXAMS = 4; // số đề trong ưu đãi
const DEFAULT_PRICE = 500; // phí mỗi đề hiện khi chưa lấy được phí thật từ máy chủ

// Quà đăng ký lần đầu: số credit (admin cấu hình) và quy ra số đề được mở sẵn. Admin không tặng thì hasGift = false.
export function useSignupGift() {
  const realPrice = useApi(() => examApi.price(), []).data?.price;
  const price = realPrice ?? DEFAULT_PRICE;
  const bonus = useApi(() => authApi.signupBonus(), []).data?.credit ?? 0;
  const gifted = price <= 0 ? GIFT_EXAMS : Math.min(GIFT_EXAMS, Math.floor(bonus / price)); // số đề mở sẵn bằng quà đăng ký
  return { price, priceKnown: realPrice !== undefined, bonus, gifted, hasGift: gifted > 0 && bonus > 0, exams: GIFT_EXAMS };
}
