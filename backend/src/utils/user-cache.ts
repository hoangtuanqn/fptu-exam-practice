import type { PublicUser } from "../repositories/user.repository";
import { TtlCache } from "./ttl-cache";

// Mỗi request đăng nhập đều phải biết người dùng còn hoạt động không. Giữ bản ghi vài giây thay vì hỏi DB mỗi lần.
// Mọi chỗ ghi vào bảng users (khoá/đổi quyền, số dư, Pro...) gọi invalidate nên thay đổi có hiệu lực ngay;
// TTL ngắn chỉ là lưới an toàn cho khoảng hở rất nhỏ giữa lúc xoá cache và lúc transaction commit.
// (Không import repository ở đây để repository gọi invalidate được mà không tạo vòng phụ thuộc.)
const USER_CACHE_MS = 10_000;
const cache = new TtlCache<number, PublicUser>(USER_CACHE_MS, 5000);

export const userCache = {
  get: (id: number, load: () => Promise<PublicUser | null>) => cache.wrap(id, load as () => Promise<PublicUser>) as Promise<PublicUser | null>,
  invalidate: (id: number) => cache.delete(id),
};
