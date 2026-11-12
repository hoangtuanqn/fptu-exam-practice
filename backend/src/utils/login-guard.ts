// Đếm lần đăng nhập sai theo (IP + email): từ 3 lần phải qua captcha, từ 7 lần bị khoá 15 phút.
// shortcut: lưu trong bộ nhớ (PM2 chạy một tiến trình), mất khi khởi động lại; khi chạy nhiều tiến trình thì chuyển sang DB/Redis.
export const CAPTCHA_AFTER = 3;
export const LOCK_AFTER = 7;
const WINDOW_MS = 15 * 60 * 1000; // tính từ lần sai gần nhất; hết hạn thì đếm lại từ 0

const fails = new Map<string, { count: number; last: number }>();

const countOf = (key: string) => {
  const e = fails.get(key);
  if (!e) return 0;
  if (Date.now() - e.last > WINDOW_MS) { fails.delete(key); return 0; }
  return e.count;
};

export const loginGuard = {
  count: countOf,
  fail(key: string) {
    if (fails.size > 5000) for (const k of fails.keys()) countOf(k); // dọn mục hết hạn, tránh phình bộ nhớ
    fails.set(key, { count: countOf(key) + 1, last: Date.now() });
  },
  clear: (key: string) => void fails.delete(key),
};
