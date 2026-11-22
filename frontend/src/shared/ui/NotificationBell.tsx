import { useEffect, useId, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  CircleAlert,
  Info,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useApi } from "@/shared/hooks/useApi";
import { formatDateTime } from "@/shared/utils/formatters";
import { IconButton } from "./Button";
import { idsToMark } from "./bellMarks";

export type NoticeLevel = "info" | "success" | "warning" | "error";

// Phần chung của thông báo người dùng và thông báo quản trị mà chuông cần
export interface BellNotice {
  id: string;
  level: NoticeLevel;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
  readAt: string | null;
}

// Kiểu hiển thị theo mức độ, dùng chung cho chuông và các trang Thông báo
export const NOTICE_LEVEL: Record<
  NoticeLevel,
  { icon: LucideIcon; color: string; label: string }
> = {
  info: { icon: Info, color: "text-primary", label: "Thông tin" },
  success: { icon: CheckCircle2, color: "text-success", label: "Thành công" },
  warning: { icon: AlertTriangle, color: "text-warning", label: "Cảnh báo" },
  error: { icon: CircleAlert, color: "text-error", label: "Lỗi" },
};

// "Vừa xong", "5 phút trước", "3 giờ trước", "2 ngày trước"; quá một tuần thì hiện ngày giờ đầy đủ
export function timeAgo(iso: string, now = Date.now()) {
  const sec = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (sec < 60) return "Vừa xong";
  if (sec < 3600) return `${Math.floor(sec / 60)} phút trước`;
  if (sec < 86_400) return `${Math.floor(sec / 3600)} giờ trước`;
  if (sec < 7 * 86_400) return `${Math.floor(sec / 86_400)} ngày trước`;
  return formatDateTime(iso);
}

function PreviewRow({
  n,
  unread,
  href,
  onOpen,
}: {
  n: BellNotice;
  unread: boolean;
  href: string | null;
  onOpen: () => void;
}) {
  const { icon: Icon, color, label } = NOTICE_LEVEL[n.level] ?? NOTICE_LEVEL.info;
  const className = `md-motion flex w-full gap-3 px-4 py-3 text-left ${href ? "md-state" : ""} ${unread ? "bg-primary-container/20" : ""}`;
  const content = (
    <>
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
    </>
  );
  return (
    <li>
      {href ? (
        <Link to={href} onClick={onOpen} className={className}>
          {content}
        </Link>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  );
}

/**
 * Chuông thông báo: bấm (hoặc Enter/Space) để xổ ra các thông báo mới nhất, bấm lại / bấm ra ngoài / Esc để đóng.
 * Thông báo nào đã hiện trong danh sách thì coi là đã đọc khi đóng (chỉ gửi một lần, chỉ những cái còn chưa đọc).
 * Chấm "chưa đọc" giữ nguyên lúc đang mở để người dùng còn thấy cái nào mới.
 */
export function NotificationBell({
  label,
  unread,
  urgent = false,
  load,
  reloadKey,
  markRead,
  markAll,
  allHref,
  hrefOf,
}: {
  label: string; // tên nút chuông cho trình đọc màn hình (kèm số chưa đọc)
  unread: number;
  urgent?: boolean; // badge màu đỏ (ví dụ có thông báo quan trọng)
  load: () => Promise<BellNotice[]>;
  reloadKey?: unknown; // đổi giá trị thì tải lại danh sách lúc đang mở (thông báo mới đến)
  markRead: (ids: string[]) => Promise<unknown>; // nơi gọi tự trừ số đếm trước rồi hỏi lại server
  markAll: () => Promise<unknown>;
  allHref: string;
  hrefOf: (n: BellNotice) => string | null;
}) {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const isOpen = useRef(false);
  const box = useRef<HTMLDivElement>(null);
  const sent = useRef(new Set<string>()); // đã gửi đánh dấu đọc: không gửi lại, hiện như đã đọc
  const shown = useRef<BellNotice[]>([]);

  // Tải lại mỗi lần mở (và khi có thông báo mới lúc đang mở), giữ danh sách lần trước để hiện ngay
  const preview = useApi(
    () => (open ? load() : Promise.resolve(null)),
    [open, reloadKey],
  );
  const last = useRef<BellNotice[] | null>(null);
  if (preview.data) last.current = preview.data;
  const items = preview.data ?? last.current;
  if (open) shown.current = items ?? [];

  const close = (refocus = false) => {
    if (!isOpen.current) return; // bấm ra ngoài rồi Esc liền nhau: chỉ đóng và gửi một lần
    isOpen.current = false;
    setOpen(false);
    if (refocus) box.current?.querySelector("button")?.focus();
    const ids = idsToMark(shown.current, sent.current);
    if (ids.length === 0) return;
    ids.forEach((id) => sent.current.add(id));
    markRead(ids).catch(() => ids.forEach((id) => sent.current.delete(id)));
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) =>
      !box.current?.contains(e.target as Node) && closeRef.current();
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" && closeRef.current(true);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const readAll = async () => {
    try {
      await markAll();
      (items ?? []).forEach((n) => sent.current.add(n.id));
    } catch {
      /* số đếm được hỏi lại từ server */
    }
    preview.reload();
  };

  return (
    <div ref={box} className="relative">
      <IconButton
        label={label}
        onClick={() => {
          if (isOpen.current) return close();
          isOpen.current = true;
          setOpen(true);
        }}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <Bell size={22} aria-hidden />
        {unread > 0 && (
          <span
            aria-hidden
            className={`md-label-medium absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 tabular-nums ${urgent ? "bg-error text-on-error" : "bg-primary text-on-primary"}`}
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
          // Màn hẹp: trải gần hết bề ngang dưới thanh trên cùng để không tràn ra ngoài bên trái
          className="md-enter fixed inset-x-3 top-16 z-40 overflow-hidden rounded-m3-lg bg-surface-container-high text-on-surface shadow-m3-3 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:w-96"
        >
          <div className="flex flex-wrap items-center justify-between gap-x-2 border-b border-outline-variant px-4 py-2">
            <span className="md-title-small">
              Thông báo{unread ? ` (${unread > 99 ? "99+" : unread} chưa đọc)` : ""}
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void readAll()}
                className="md-label-large md-state md-motion -mr-3 inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-primary"
              >
                <CheckCheck size={14} aria-hidden /> Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>

          <div className="max-h-[60vh] overflow-y-auto">
            {!items ? (
              <p className="md-body-medium px-4 py-6 text-center text-on-surface-variant">
                {preview.error ? "Chưa tải được thông báo" : "Đang tải…"}
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
                    unread={n.readAt === null && !sent.current.has(n.id)}
                    href={hrefOf(n)}
                    onOpen={() => close()}
                  />
                ))}
              </ul>
            )}
          </div>

          <Link
            to={allHref}
            onClick={() => close()}
            className="md-label-large md-state md-motion block border-t border-outline-variant px-4 py-3.5 text-center text-primary"
          >
            Xem tất cả
          </Link>
        </div>
      )}
    </div>
  );
}
