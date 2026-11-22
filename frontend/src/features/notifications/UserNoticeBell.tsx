import { useAuth } from "@/features/auth/AuthContext";
import { NotificationBell } from "@/shared/ui/NotificationBell";
import { notificationsApi } from "./notifications.api";
import { internalLink } from "@/shared/ui/bellMarks";
import {
  markAllRead,
  markRead,
  useNotificationVersion,
  useUnreadNotifications,
} from "./notifications.store";

const PREVIEW = 5; // số thông báo mới nhất hiện trong danh sách xổ ra

function Bell() {
  const unread = useUnreadNotifications();
  const arrived = useNotificationVersion();
  return (
    <NotificationBell
      label={unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
      unread={unread}
      load={() => notificationsApi.list(1, PREVIEW).then((r) => r.items)}
      reloadKey={arrived}
      markRead={markRead}
      markAll={markAllRead}
      allHref="/account/notifications"
      hrefOf={(n) => internalLink(n.link)}
    />
  );
}

// Chuông thông báo trên thanh đầu trang, chỉ hiện khi đã đăng nhập
export function UserNoticeBell() {
  const { user } = useAuth();
  return user ? <Bell /> : null;
}
