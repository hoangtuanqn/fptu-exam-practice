import { http } from "@/shared/api/client";
import { PAGE_SIZE } from "@/shared/api/pagination";
import type { BellNotice } from "@/shared/ui/NotificationBell";

// Thông báo gửi tới người dùng (thông báo hệ thống của admin, việc liên quan tới tài khoản...)
export interface UserNotice extends BellNotice {
  kind: string;
}

export const notificationsApi = {
  list: (page: number, limit = PAGE_SIZE) =>
    http.list<UserNotice>("/notifications", { page, limit }),
  unreadCount: () => http.get<{ unread: number }>("/notifications/unread-count"),
  read: (ids: string[]) =>
    http.post<{ updated: number }>("/notifications/read", { ids }),
  readAll: () => http.post<{ updated: number }>("/notifications/read-all"),
};
