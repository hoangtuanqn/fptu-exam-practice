// Giới hạn số tác vụ bất đồng bộ chạy cùng lúc; tác vụ chờ theo thứ tự đăng ký (FIFO)
export function createLimiter(max: number) {
  let active = 0;
  const waiting: (() => void)[] = [];

  const release = () => {
    active--;
    waiting.shift()?.();
  };

  return async function limit<T>(task: () => Promise<T>): Promise<T> {
    if (active >= max) await new Promise<void>((resolve) => waiting.push(resolve));
    active++;
    try {
      return await task();
    } finally {
      release();
    }
  };
}
