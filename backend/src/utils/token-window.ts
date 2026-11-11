// Giới hạn token theo cửa sổ trượt (vd 5 giờ): một lượt dùng tính vào giới hạn cho tới đúng `windowMs` sau khi ghi, rồi hết tính.
// Hàm thuần, không đụng DB: service đọc các lượt dùng trong cửa sổ rồi truyền vào đây.

export interface TokenEntry {
  createdAt: Date;
  totalTokens: number;
}

export interface WindowStatus {
  used: number;
  remaining: number;
  percentUsed: number; // số nguyên 0..100
  resetsAt: Date | null; // lúc lượt dùng cũ nhất trong cửa sổ hết tính; null nếu chưa dùng gì
}

/** Mốc bắt đầu cửa sổ: lượt dùng ghi ĐÚNG lúc `now - windowMs` đã hết tính. */
export const windowStart = (now: Date, windowMs: number) => new Date(now.getTime() - windowMs);

const inWindow = (entries: readonly TokenEntry[], now: Date, windowMs: number) => {
  const start = windowStart(now, windowMs).getTime();
  return entries.filter((e) => e.createdAt.getTime() > start && e.createdAt.getTime() <= now.getTime()).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
};

export function windowStatus(entries: readonly TokenEntry[], limit: number, windowMs: number, now = new Date()): WindowStatus {
  const live = inWindow(entries, now, windowMs);
  const used = live.reduce((s, e) => s + Math.max(0, e.totalTokens), 0);
  const percentUsed = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  return {
    used,
    remaining: Math.max(0, limit - used),
    percentUsed: used > 0 && percentUsed === 0 ? 1 : percentUsed, // đã dùng chút ít thì vẫn hiện 1% thay vì 0%
    resetsAt: live.length ? new Date(live[0]!.createdAt.getTime() + windowMs) : null,
  };
}

/**
 * Sớm nhất lúc nào còn đủ `needed` token: các lượt cũ lần lượt hết tính cho tới khi phần còn lại đủ.
 * Trả `now` nếu đã đủ ngay; trả null nếu `needed` lớn hơn cả giới hạn (không bao giờ đủ).
 */
export function availableAt(entries: readonly TokenEntry[], limit: number, windowMs: number, needed: number, now = new Date()): Date | null {
  if (needed > limit) return null;
  const live = inWindow(entries, now, windowMs);
  let used = live.reduce((s, e) => s + Math.max(0, e.totalTokens), 0);
  if (limit - used >= needed) return now;
  for (const e of live) {
    used -= Math.max(0, e.totalTokens);
    if (limit - used >= needed) return new Date(e.createdAt.getTime() + windowMs);
  }
  return now; // không tới được đây (hết mọi lượt thì used = 0 <= limit - needed)
}
