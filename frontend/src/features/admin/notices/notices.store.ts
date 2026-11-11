import { useSyncExternalStore } from "react";
import {
  adminApi,
  type NoticeCounts,
  type AdminNotice,
} from "@/features/admin/api/admin.api";
import { onServerEvent } from "@/shared/realtime/socket";
import { EVENTS } from "@/shared/realtime/events";

// Số thông báo chưa đọc dùng chung cho chuông ở thanh đầu trang và trang Thông báo.
// Cập nhật ngay khi server đẩy thông báo mới (socket); hỏi định kỳ làm dự phòng khi mất kết nối.
const EMPTY: NoticeCounts = {
  unread: 0,
  importantUnread: 0,
  categories: { account: 0, fetch: 0, money: 0, exam: 0, system: 0 },
};
const FALLBACK_POLL_MS = 60_000;

let counts: NoticeCounts = EMPTY;
let version = 0; // tăng mỗi khi có thông báo mới đến: trang danh sách dựa vào đây để tải lại
const listeners = new Set<() => void>();
const newHandlers = new Set<(n: AdminNotice) => void>();
let started: (() => void) | null = null;
let timer: ReturnType<typeof setInterval> | null = null;

const emit = () => listeners.forEach((fn) => fn());

export async function refreshNoticeCounts() {
  try {
    counts = await adminApi.noticeCounts();
    emit();
  } catch {
    /* lần sau hỏi lại */
  }
}

function start() {
  if (started) return;
  void refreshNoticeCounts();
  const off = onServerEvent<AdminNotice>(EVENTS.adminNotice, (n) => {
    version++;
    void refreshNoticeCounts();
    newHandlers.forEach((fn) => fn(n));
  });
  timer = setInterval(() => void refreshNoticeCounts(), FALLBACK_POLL_MS);
  started = () => {
    off();
    if (timer) clearInterval(timer);
    timer = null;
  };
}

function subscribe(fn: () => void) {
  start();
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0 && newHandlers.size === 0) {
      started?.();
      started = null;
    }
  };
}

export const useNoticeCounts = () =>
  useSyncExternalStore(subscribe, () => counts);
export const useNoticeVersion = () =>
  useSyncExternalStore(subscribe, () => version);

/** Gọi khi có thông báo mới đến (ví dụ để hiện toast). Trả về hàm hủy. */
export function onNewNotice(fn: (n: AdminNotice) => void) {
  newHandlers.add(fn);
  start();
  return () => {
    newHandlers.delete(fn);
  };
}
