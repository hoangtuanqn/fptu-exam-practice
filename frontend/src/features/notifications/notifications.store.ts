import { useSyncExternalStore } from "react";
import { onServerEvent } from "@/shared/realtime/socket";
import { EVENTS } from "@/shared/realtime/events";
import { notificationsApi } from "./notifications.api";

// Số thông báo chưa đọc của người dùng, dùng chung cho chuông và trang Thông báo.
// Server đẩy thông báo mới qua socket; hỏi định kỳ và mỗi khi quay lại tab làm dự phòng khi mất kết nối.
const POLL_MS = 60_000;

let unread = 0;
let version = 0; // tăng mỗi khi có thông báo mới đến: chuông đang mở dựa vào đây để tải lại
const listeners = new Set<() => void>();
let stop: (() => void) | null = null;

const emit = () => listeners.forEach((fn) => fn());

export async function refreshUnread() {
  try {
    const r = await notificationsApi.unreadCount();
    unread = typeof r?.unread === "number" ? r.unread : 0;
    emit();
  } catch {
    /* lần sau hỏi lại */
  }
}

/** Đánh dấu đã đọc: trừ số đếm ngay, rồi hỏi lại server cho đúng. */
export async function markRead(ids: string[]) {
  unread = Math.max(0, unread - ids.length);
  emit();
  try {
    await notificationsApi.read(ids);
  } finally {
    void refreshUnread();
  }
}

export async function markAllRead() {
  try {
    return await notificationsApi.readAll();
  } finally {
    void refreshUnread();
  }
}

function start() {
  if (stop) return;
  void refreshUnread();
  const onFocus = () => void refreshUnread();
  const timer = setInterval(onFocus, POLL_MS);
  window.addEventListener("focus", onFocus);
  const off = onServerEvent(EVENTS.userNotice, () => {
    version++;
    void refreshUnread();
  });
  stop = () => {
    off();
    clearInterval(timer);
    window.removeEventListener("focus", onFocus);
  };
}

function subscribe(fn: () => void) {
  start();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) {
      stop?.();
      stop = null;
    }
  };
}

export const useNotificationVersion = () =>
  useSyncExternalStore(subscribe, () => version);
export const useUnreadNotifications = () =>
  useSyncExternalStore(subscribe, () => unread);
