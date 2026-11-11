import { useEffect, useId, useRef, useState } from "react";
import { Bell, CheckCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { adminApi, type AdminNotice } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { IconButton } from "@/shared/ui/Button";
import { formatDateTime } from "@/shared/utils/formatters";
import { LEVEL, timeAgo } from "./notices.shared";
import {
  onNewNotice,
  refreshNoticeCounts,
  useNoticeCounts,
  useNoticeVersion,
} from "./notices.store";

const PREVIEW = 8; // số thông báo mới nhất hiện trong danh sách xổ ra
const CLOSE_DELAY_MS = 180; // rê chuột ra khỏi chuông sang danh sách không bị đóng giữa chừng

function PreviewRow({
  n,
  onOpen,
}: {
  n: AdminNotice;
  onOpen: (n: AdminNotice) => void;
}) {
  const unread = n.readAt === null;
  const { icon: Icon, color, label } = LEVEL[n.level];
  return (
    <li>
      <button
        type="button"
        onClick={() => onOpen(n)}
        className={`md-state md-motion flex w-full gap-3 px-4 py-3 text-left ${unread ? "bg-primary-container/20" : ""}`}
      >
        <Icon size={18} aria-hidden className={`mt-0.5 shrink-0 ${color}`} />
        <span className="min-w-0 flex-1">
          <span className="sr-only">
            {unread ? "Chưa đọc. " : ""}
            {label}.{" "}
          </span>
          <span
            className={`md-body-medium block truncate ${unread ? "font-semibold text-on-surface" : "text-on-surface-variant"}`}
          >
            {n.title}
          </span>
          {n.body && (
            <span className="md-body-small block truncate text-on-surface-variant">
              {n.body.replace(/\n/g, " · ")}
            </span>
          )}
          <time
            dateTime={n.createdAt}
            title={formatDateTime(n.createdAt)}
            className="md-label-medium block text-on-surface-variant"
          >
            {timeAgo(n.createdAt)}
          </time>
        </span>
        {unread && (
          <span
            aria-hidden
            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
          />
        )}
      </button>
    </li>
  );
}

// Chuông thông báo trên thanh đầu trang quản trị. Rê chuột hoặc Tab vào chuông thì xổ ra các thông báo mới nhất;
// bấm vào chuông (hoặc "Xem tất cả") là sang trang Thông báo. Có thông báo quan trọng mới thì hiện toast.
export function NoticeBell() {
  const navigate = useNavigate();
  const toast = useToast();
  const panelId = useId();
  const { unread, importantUnread } = useNoticeCounts();
  const arrived = useNoticeVersion();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () =>
      onNewNotice((n) => {
        if (!n.important) return;
        if (n.level === "error") toast.error(n.title);
        else toast.success(n.title);
      }),
    [toast],
  );

  // Tải lại mỗi lần mở (và khi có thông báo mới đến lúc đang mở), nhưng giữ danh sách lần trước để hiện ngay, không nháy "Đang tải"
  const preview = useApi(
    () =>
      open
        ? adminApi.notices(1, { status: "all" }, PREVIEW)
        : Promise.resolve(null),
    [open, arrived],
  );
  const last = useRef<typeof preview.data>(null);
  if (preview.data) last.current = preview.data;
  const items = (preview.data ?? last.current)?.items;

  // Bấm ra ngoài hoặc Esc thì đóng
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) =>
      !box.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const enter = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };
  const leave = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), CLOSE_DELAY_MS);
  };

  const openNotice = async (n: AdminNotice) => {
    setOpen(false);
    if (n.readAt === null) {
      await adminApi.setNoticeRead(n.id, true).catch(() => undefined);
      void refreshNoticeCounts();
    }
    navigate(n.link ?? "/admin/notifications");
  };

  const readAll = async () => {
    await adminApi.readAllNotices({}).catch(() => undefined);
    void refreshNoticeCounts();
    preview.reload();
  };

  return (
    <div
      ref={box}
      className="relative"
      onMouseEnter={enter}
      onMouseLeave={leave}
      // Người dùng bàn phím: Tab vào chuông cũng mở danh sách, Tab ra khỏi cả khối thì đóng
      onFocus={enter}
      onBlur={(e) =>
        !e.currentTarget.contains(e.relatedTarget as Node | null) && leave()
      }
    >
      <IconButton
        label={
          unread
            ? `Thông báo, ${unread} chưa đọc${importantUnread ? `, ${importantUnread} quan trọng` : ""}`
            : "Thông báo"
        }
        onClick={() => {
          setOpen(false);
          navigate("/admin/notifications");
        }}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <Bell size={22} aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className={`md-label-medium absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 tabular-nums ${importantUnread > 0 ? "bg-error text-on-error" : "bg-primary text-on-primary"}`}
          >
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </IconButton>

      {open && (
        <div
          id={panelId}
          role="region"
          aria-label="Thông báo mới nhất"
          className="md-enter absolute right-0 top-full z-40 w-[min(24rem,calc(100vw-1.5rem))] overflow-hidden rounded-m3-lg bg-surface-container-high text-on-surface shadow-m3-3"
        >
          <div className="flex items-center justify-between gap-2 border-b border-outline-variant px-4 py-2">
            <span className="md-title-small">
              Thông báo{unread ? ` (${unread} chưa đọc)` : ""}
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void readAll()}
                className="md-label-large md-state md-motion inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-primary"
              >
                <CheckCheck size={14} aria-hidden /> Đọc hết
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {!items ? (
              <p className="md-body-medium px-4 py-6 text-center text-on-surface-variant">
                Đang tải…
              </p>
            ) : items.length === 0 ? (
              <p className="md-body-medium px-4 py-6 text-center text-on-surface-variant">
                Chưa có thông báo nào
              </p>
            ) : (
              <ul className="divide-y divide-outline-variant">
                {items.map((n) => (
                  <PreviewRow
                    key={n.id}
                    n={n}
                    onOpen={(x) => void openNotice(x)}
                  />
                ))}
              </ul>
            )}
          </div>

          <Link
            to="/admin/notifications"
            onClick={() => setOpen(false)}
            className="md-label-large md-state md-motion block border-t border-outline-variant px-4 py-3.5 text-center text-primary"
          >
            Xem tất cả
          </Link>
        </div>
      )}
    </div>
  );
}
