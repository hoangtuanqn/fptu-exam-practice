import { BADGE_PIN_MAX, type BadgeDef } from "../constants/badges";

/** Cấp cao nhất mà `value` đạt (0 = chưa đạt). */
export const tierFor = (def: BadgeDef, value: number) => def.tiers.reduce((tier, t) => (value >= t.threshold ? t.level : tier), 0);

/** Cấp mới cần ghi, hoặc null khi không lên cấp (không bao giờ hạ cấp). */
export const raisedTier = (stored: number, computed: number) => (computed > stored ? computed : null);

/** Tiến độ: số đo hiện tại và mốc của cấp kế tiếp (null = đã cấp cao nhất). */
export const progressOf = (def: BadgeDef, tier: number, current: number) => ({
  current,
  next: def.tiers.find((t) => t.level === tier + 1)?.threshold ?? null,
});

/** Lỗi của danh sách ghim (null = hợp lệ): tối đa BADGE_PIN_MAX, không trùng, chỉ huy hiệu đã đạt. */
export function pinError(keys: readonly string[], earned: ReadonlySet<string>): string | null {
  if (keys.length > BADGE_PIN_MAX) return `Chỉ ghim được tối đa ${BADGE_PIN_MAX} huy hiệu`;
  if (new Set(keys).size !== keys.length) return "Danh sách huy hiệu bị trùng";
  if (keys.some((k) => !earned.has(k))) return "Chỉ ghim được huy hiệu bạn đã đạt";
  return null;
}
