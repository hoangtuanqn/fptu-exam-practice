import { z } from "zod";
import { BADGE_KEY_MAX, BADGE_PIN_MAX } from "../../constants/badges";

// Trùng lặp và "chỉ huy hiệu đã đạt" kiểm tra ở service (utils/badges.pinError)
export const setBadgePinsBody = z.object({
  keys: z
    .array(z.string("Huy hiệu không hợp lệ").max(BADGE_KEY_MAX, "Huy hiệu không hợp lệ"), "Danh sách huy hiệu không hợp lệ")
    .max(BADGE_PIN_MAX, `Chỉ ghim được tối đa ${BADGE_PIN_MAX} huy hiệu`),
});

export type SetBadgePinsBody = z.infer<typeof setBadgePinsBody>;
