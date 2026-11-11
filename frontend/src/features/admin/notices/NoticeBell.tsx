import { useEffect } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/shared/context/ToastContext";
import { IconButton } from "@/shared/ui/Button";
import { onNewNotice, useNoticeCounts } from "./notices.store";

// Chuông thông báo trên thanh đầu trang quản trị: số chưa đọc; có thông báo quan trọng mới thì hiện toast
export function NoticeBell() {
  const navigate = useNavigate();
  const toast = useToast();
  const { unread, importantUnread } = useNoticeCounts();

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
    <IconButton
      label={unread ? `Thông báo, ${unread} chưa đọc` : "Thông báo"}
      onClick={() => navigate("/admin/notifications")}
    >
      <Bell size={22} />
      {unread > 0 && (
        <span
          className={`md-label-small absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 tabular-nums ${importantUnread > 0 ? "bg-error text-on-error" : "bg-primary text-on-primary"}`}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </IconButton>
  );
}
