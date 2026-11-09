/**
 * Bộ nhớ đệm có hạn dùng, trong bộ nhớ của tiến trình (app chạy một tiến trình duy nhất, xem ecosystem.config.cjs).
 * Giới hạn số mục để không phình mãi; đầy thì bỏ mục cũ nhất.
 */
export class TtlCache<K, V> {
  private readonly map = new Map<K, { at: number; value: V }>();

  constructor(
    private readonly ttlMs: number,
    private readonly max = 5000,
  ) {}

  get(key: K): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (Date.now() - hit.at >= this.ttlMs) {
      this.map.delete(key);
      return undefined;
    }
    return hit.value;
  }

  set(key: K, value: V) {
    this.map.delete(key); // đặt lại thứ tự: mục mới nhất nằm cuối
    this.map.set(key, { at: Date.now(), value });
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value as K);
  }

  delete(key: K) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }

  /** Có trong cache thì trả luôn, không thì gọi `load` rồi lưu lại (kết quả undefined/null không được lưu). */
  async wrap(key: K, load: () => Promise<V>): Promise<V> {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const value = await load();
    if (value !== undefined && value !== null) this.set(key, value);
    return value;
  }
}
