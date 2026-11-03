const KEY = "guest_id";

const newId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

let memory: string | null = null; // dự phòng khi trình duyệt chặn localStorage

// ID ẩn danh của trình duyệt này, gửi kèm mọi request để khách có kho đề riêng.
// Khi đăng ký/đăng nhập, server chuyển các đề gắn với ID này về tài khoản.
export function getGuestId(): string {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) return saved;
    const id = newId();
    localStorage.setItem(KEY, id);
    return id;
  } catch {
    return (memory ??= newId());
  }
}
