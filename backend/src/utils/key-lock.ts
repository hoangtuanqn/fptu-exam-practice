/**
 * Khoá theo khoá chuỗi trong tiến trình: các tác vụ cùng khoá chạy lần lượt (FIFO), khác khoá thì chạy song song.
 * Chỉ đúng khi app chạy một tiến trình (PM2 một instance), như các hàng đợi nền khác.
 */
export function createKeyLock() {
  const tails = new Map<string, Promise<void>>();
  async function withLock<T>(key: string, task: () => Promise<T>): Promise<T> {
    const prev = tails.get(key) ?? Promise.resolve();
    let release!: () => void;
    const tail = prev.then(() => new Promise<void>((resolve) => (release = resolve)));
    tails.set(key, tail);
    await prev;
    try {
      return await task();
    } finally {
      release();
      if (tails.get(key) === tail) tails.delete(key);
    }
  }
  /** Đang có tác vụ giữ (hoặc chờ) khoá này: tác vụ mới sẽ phải chờ. */
  withLock.isBusy = (key: string) => tails.has(key);
  return withLock;
}
