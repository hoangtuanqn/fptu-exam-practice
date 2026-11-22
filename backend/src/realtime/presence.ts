import { realtimeHub } from "./hub";

/**
 * Ai đang online và đang ở trang nào, tính từ chính các kết nối socket (không ai phải hỏi định kỳ).
 * Chỉ nằm trong RAM của một tiến trình: shortcut: chạy một instance PM2, đổi sang io.fetchSockets() hoặc Redis khi chạy nhiều instance.
 */
type Entry = { userId: string | null; page: string }; // userId null = khách
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
  add(socketId: string, userId: string | null) {
    sockets.set(socketId, { userId, page: "" });
    notify();
  },

  setPage(socketId: string, raw: unknown) {
    const e = sockets.get(socketId);
    if (!e || typeof raw !== "string" || !PAGE_RE.test(raw)) return;
    e.page = raw;
    notify();
  },

  remove(socketId: string) {
    if (sockets.delete(socketId)) notify();
  },

  // Thành viên: mỗi người một dòng, kèm các trang đang mở (nhiều tab). Khách chỉ đếm.
  snapshot() {
    const members = new Map<string, Set<string>>();
    let guests = 0;
    for (const { userId, page } of sockets.values()) {
      if (!userId) guests++;
      else (members.get(userId) ?? members.set(userId, new Set()).get(userId)!).add(page || "?");
    }
    return { guests, members: [...members].map(([userId, pages]) => ({ userId, pages: [...pages] })) };
  },
};
