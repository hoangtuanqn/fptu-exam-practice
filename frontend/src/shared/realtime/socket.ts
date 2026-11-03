import { io, type Socket } from "socket.io-client";
import { getGuestId } from "@/shared/api/guest";
import { API_ORIGIN, tokenStore } from "@/shared/api/client";
import { EVENTS, SOCKET_PATH, type RoomKind } from "./events";

/**
 * Một kết nối socket dùng chung cho cả ứng dụng, tạo khi cần đến lần đầu.
 * Các màn hình chỉ gọi `subscribeRoom`; việc vào lại phòng sau khi mất kết nối nằm ở đây.
 */
let socket: Socket | null = null;
const rooms = new Map<string, { kind: RoomKind; id: number; count: number }>();
const key = (kind: RoomKind, id: number) => `${kind}:${id}`;

const join = (s: Socket, kind: RoomKind, id: number) => s.emit(EVENTS.subscribe, { room: kind, id });

function getSocket(): Socket {
  if (socket) return socket;
  socket = io(API_ORIGIN || undefined, {
    path: SOCKET_PATH,
    // Đọc lại mỗi lần (tái) kết nối để luôn dùng token hiện tại
    auth: (cb) => cb({ token: tokenStore.get() ?? undefined, guestId: getGuestId() }),
    transports: ["websocket", "polling"],
  });
  // Server không nhớ phòng sau khi mất kết nối: vào lại tất cả phòng đang theo dõi
  socket.on("connect", () => rooms.forEach((r) => join(socket!, r.kind, r.id)));
  return socket;
}

export const isRealtimeConnected = () => socket?.connected ?? false;

// Đăng nhập/đăng xuất đổi danh tính: nối lại để server xác thực theo tài khoản mới
export function refreshRealtimeAuth() {
  if (!socket) return;
  socket.disconnect().connect();
}

/** Theo dõi một phòng (đề hoặc job). Trả về hàm hủy. Server gửi ngay trạng thái hiện tại sau khi vào phòng. */
export function subscribeRoom<T>(kind: RoomKind, id: number, event: string, handler: (payload: T) => void): () => void {
  const s = getSocket();
  const k = key(kind, id);
  const entry = rooms.get(k);
  if (entry) entry.count++;
  else {
    rooms.set(k, { kind, id, count: 1 });
    if (s.connected) join(s, kind, id);
  }
  s.on(event, handler);

  return () => {
    s.off(event, handler);
    const e = rooms.get(k);
    if (!e) return;
    if (--e.count <= 0) {
      rooms.delete(k);
      s.emit(EVENTS.unsubscribe, { room: kind, id });
    }
  };
}

/** Báo cho các màn hình biết kết nối còn sống hay không (để dự phòng bằng hỏi định kỳ khi mất kết nối). */
export function onConnectionChange(fn: (connected: boolean) => void): () => void {
  const s = getSocket();
  const up = () => fn(true);
  const down = () => fn(false);
  s.on("connect", up);
  s.on("disconnect", down);
  s.on("connect_error", down);
  return () => {
    s.off("connect", up);
    s.off("disconnect", down);
    s.off("connect_error", down);
  };
}
