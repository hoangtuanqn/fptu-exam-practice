import { Bell, CheckCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Button } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { NOTICE_LEVEL, timeAgo } from "@/shared/ui/NotificationBell";
import { internalLink } from "@/shared/ui/bellMarks";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Pagination } from "@/shared/ui/Table";
import { formatDateTime } from "@/shared/utils/formatters";
import { notificationsApi, type UserNotice } from "./notifications.api";
import { markAllRead, markRead, useNotificationVersion, useUnreadNotifications } from "./notifications.store";

function NoticeRow({ n, onOpen }: { n: UserNotice; onOpen: () => void }) {
  const unread = n.readAt === null;
  const link = internalLink(n.link);
  const { icon: Icon, color, label } = NOTICE_LEVEL[n.level] ?? NOTICE_LEVEL.info;
  return (
    <li className={`flex gap-3 px-4 py-3 sm:px-5 ${unread ? "bg-primary-container/20" : ""}`}>
      <Icon size={20} aria-hidden className={`mt-0.5 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <span className="sr-only">
          {unread ? "Chưa đọc. " : ""}
          {label}.{" "}
        </span>
        <span className={`md-body-large break-words ${unread ? "font-semibold text-on-surface" : "text-on-surface-variant"}`}>
          {n.title}
        </span>
        {n.body && (
          <p className="md-body-medium mt-0.5 whitespace-pre-line break-words text-on-surface-variant">{n.body}</p>
        )}
        <p className="md-body-small mt-1 text-on-surface-variant">
          <time dateTime={n.createdAt} title={formatDateTime(n.createdAt)}>
            {timeAgo(n.createdAt)}
          </time>
        </p>
      </div>
      {link && (
        <Link
          to={link}
          onClick={onOpen}
          className="md-label-large md-state md-motion inline-flex h-10 shrink-0 items-center rounded-full px-4 text-primary"
        >
          Xem
        </Link>
      )}
    </li>
  );
}

export default function NotificationsPage() {
  const toast = useToast();
  const unread = useUnreadNotifications();
  const arrived = useNotificationVersion();
  const [url, setUrl] = useUrlState({ page: "1" });
  const page = toPage(url.page);
  const list = useApi(() => notificationsApi.list(page), [page, arrived]);

  const readAll = async () => {
    try {
      const r = await markAllRead();
      toast.success(r?.updated ? `Đã đánh dấu ${r.updated} thông báo là đã đọc` : "Không còn thông báo chưa đọc");
      list.reload();
    } catch (err) {
      toast.error(errorMessage(err, "Chưa cập nhật được"));
    }
  };

  return (
    <>
      <PageHeader
        title="Thông báo"
        description="Tin mới gửi tới tài khoản của bạn."
        action={
          <Button variant="outlined" onClick={() => void readAll()} disabled={unread === 0}>
            <CheckCheck size={16} /> Đánh dấu tất cả đã đọc
          </Button>
        }
      />
      <Card>
        <QueryBoundary query={list}>
          {(data) =>
            data.items.length === 0 ? (
              <Empty icon={Bell} title="Chưa có thông báo nào" />
            ) : (
              <>
                <ul className="divide-y divide-outline-variant">
                  {data.items.map((n) => (
                    <NoticeRow
                      key={n.id}
                      n={n}
                      onOpen={() => n.readAt === null && void markRead([n.id]).catch(() => undefined)}
                    />
                  ))}
                </ul>
                <Pagination meta={data.meta} onPage={(p) => setUrl({ page: String(p) })} />
              </>
            )
          }
        </QueryBoundary>
      </Card>
    </>
  );
}
