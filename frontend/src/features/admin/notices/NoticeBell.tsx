import { useEffect } from "react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { NotificationBell } from "@/shared/ui/NotificationBell";
import {
  markNoticesRead,
  onNewNotice,
  refreshNoticeCounts,
  useNoticeCounts,
  useNoticeVersion,
} from "./notices.store";

const PREVIEW = 8; // số thông báo mới nhất hiện trong danh sách xổ ra

// Chuông thông báo trên thanh đầu trang quản trị. Có thông báo quan trọng mới thì hiện toast.
export function NoticeBell() {
  const toast = useToast();
  const { unread, importantUnread } = useNoticeCounts();
  const arrived = useNoticeVersion();

  useEffect(
    () =>
      onNewNotice((n) => {
        if (!n.important) return;
        if (n.level === "error") toast.error(n.title);
        else toast.success(n.title);
      }),
    [toast],
  );

  return (
    <NotificationBell
      label={
        unread
          ? `Thông báo, ${unread} chưa đọc${importantUnread ? `, ${importantUnread} quan trọng` : ""}`
          : "Thông báo"
      }
      unread={unread}
      urgent={importantUnread > 0}
      load={() =>
        adminApi.notices(1, { status: "all" }, PREVIEW).then((r) => r.items)
      }
      reloadKey={arrived}
      markRead={markNoticesRead}
      markAll={() =>
        adminApi.readAllNotices({}).finally(() => void refreshNoticeCounts())
      }
      allHref="/admin/notifications"
      hrefOf={(n) => n.link ?? "/admin/notifications"}
    />
  );
}
