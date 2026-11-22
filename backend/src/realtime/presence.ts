import { realtimeHub } from "./hub";

/**
 * Ai đang online và đang ở trang nào, tính từ chính các kết nối socket (không ai phải hỏi định kỳ).
 * Chỉ nằm trong RAM của một tiến trình: shortcut: chạy một instance PM2, đổi sang io.fetchSockets() hoặc Redis khi chạy nhiều instance.
 */
type Entry = { id: string; member: boolean; page: string }; // id = userId (thành viên) hoặc guestId (khách)
const sockets = new Map<string, Entry>();

const PAGE_RE = /^\/[\w\-./:]{0,99}$/;
const NOTIFY_MS = 3000;
let timer: NodeJS.Timeout | null = null;

// Báo admin "có thay đổi" (gộp lại, tối đa một lần mỗi 3 giây); admin tự tải lại danh sách
const notify = () => {
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    realtimeHub.publishPresence();
  }, NOTIFY_MS);
  timer.unref();
};

export const presence = {
  add(socketId: string, id: string, member: boolean) {
    sockets.set(socketId, { id, member, page: "" });
    notify();
  },

  setPage(socketId: string, raw: unknown) {
    const e = sockets.get(socketId);
    if (!e) return;
    e.page = typeof raw === "string" && PAGE_RE.test(raw) ? raw : "?"; // đường dẫn lạ: đừng để trang cũ hiện sai
    notify();
  },

  remove(socketId: string) {
    if (sockets.delete(socketId)) notify();
  },

  // Thành viên: mỗi người một dòng, kèm các trang đang mở (nhiều tab). Khách chỉ đếm.
  snapshot() {
    const members = new Map<string, Set<string>>();
    const guests = new Set<string>();
    for (const { id, member, page } of sockets.values()) {
      if (!member) guests.add(id);
      else (members.get(id) ?? members.set(id, new Set()).get(id)!).add(page || "?");
    }
    return { guests: guests.size, members: [...members].map(([userId, pages]) => ({ userId, pages: [...pages] })) };
  },
};
