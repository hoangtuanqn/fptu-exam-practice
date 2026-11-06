import { http } from "@/shared/api/client";
import type { PublicOffers } from "@/shared/types/api";

export const offersApi = {
  // Số liệu ưu đãi hiện hành (đọc từ cấu hình admin), không cần đăng nhập
  get: () => http.get<PublicOffers>("/public/offers"),
};
