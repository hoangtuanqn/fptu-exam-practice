import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Circle,
  CircleAlert,
  Info,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  adminApi,
  type AdminNotice,
  type NoticeCategory,
} from "@/features/admin/api/admin.api";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { inputClass } from "@/shared/ui/Input";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination } from "@/shared/ui/Table";
import { formatDateTime } from "@/shared/utils/formatters";
import {
  refreshNoticeCounts,
  useNoticeCounts,
  useNoticeVersion,
} from "./notices.store";

const CATEGORY_LABEL: Record<NoticeCategory, string> = {
  account: "Tài khoản",
  fetch: "Lấy đề",
  money: "Nạp tiền & gói",
  exam: "Đề & AI",
  system: "Hệ thống",
};

const LEVEL: Record<AdminNotice["level"], { icon: LucideIcon; color: string }> =
  {
    info: { icon: Info, color: "text-primary" },
    success: { icon: CheckCircle2, color: "text-success" },
    warning: { icon: AlertTriangle, color: "text-warning" },
    error: { icon: CircleAlert, color: "text-error" },
  };

type Tab = "unread" | "important" | "all";

function NoticeRow({
  n,
  busy,
  onToggle,
}: {
  n: AdminNotice;
  busy: boolean;
  onToggle: () => void;
}) {
  const unread = n.readAt === null;
  const { icon: Icon, color } = LEVEL[n.level];
  return (
    <li
      className={`flex gap-3 px-4 py-3 sm:px-5 ${unread ? "bg-primary-container/20" : ""}`}
    >
      <Icon size={20} className={`mt-0.5 shrink-0 ${color}`} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={`md-body-large ${unread ? "font-semibold text-on-surface" : "text-on-surface-variant"}`}
          >
            {n.title}
          </span>
          {n.important && <Badge tone="danger">Quan trọng</Badge>}
        </div>
        {n.body && (
          <p className="md-body-medium mt-0.5 whitespace-pre-line break-words text-on-surface-variant">
            {n.body}
          </p>
        )}
        <p className="md-body-small mt-1 text-on-surface-variant">
          {CATEGORY_LABEL[n.category]} · {formatDateTime(n.createdAt)}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center">
        {n.link && (
          <Link
            to={n.link}
            onClick={() => unread && onToggle()}
            className="md-label-large md-state md-motion inline-flex h-8 items-center rounded-full px-3 text-primary"
          >
            Xem
          </Link>
        )}
        <Button
          size="sm"
          variant="text"
          disabled={busy}
          onClick={onToggle}
          aria-label={unread ? "Đánh dấu đã đọc" : "Đánh dấu chưa đọc"}
          title={unread ? "Đánh dấu đã đọc" : "Đánh dấu chưa đọc"}
        >
          {unread ? (
            <Circle size={14} className="fill-primary text-primary" />
          ) : (
            <CheckCircle2 size={16} />
          )}
          <span className="hidden sm:inline">
            {unread ? "Đã đọc" : "Chưa đọc"}
          </span>
        </Button>
      </div>
    </li>
  );
}

export default function NoticesPage() {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const counts = useNoticeCounts();
  const arrived = useNoticeVersion();
  const [url, setUrl] = useUrlState({ tab: "unread", cat: "all", page: "1" });
  const [busy, setBusy] = useState<number | null>(null);

  const tab: Tab =
    url.tab === "important" || url.tab === "all" ? url.tab : "unread";
  const category =
    url.cat in CATEGORY_LABEL ? (url.cat as NoticeCategory) : undefined;
  const page = toPage(url.page);

  const list = useApi(
    () =>
      adminApi.notices(page, {
        status: tab === "all" ? "all" : "unread",
        important: tab === "important" ? true : undefined,
        category,
      }),
    [page, tab, category, arrived],
  );

  // Đang xem danh sách thì mọi thay đổi (đọc/xóa) cũng làm mới số đếm ở chuông
  useEffect(() => void refreshNoticeCounts(), [list.data]);

  const toggle = async (n: AdminNotice) => {
    setBusy(n.id);
    try {
      await adminApi.setNoticeRead(n.id, n.readAt === null);
      list.reload();
      void refreshNoticeCounts();
    } catch (err) {
      toast.error(errorMessage(err, "Chưa cập nhật được"));
    } finally {
      setBusy(null);
    }
  };

  const readAll = async () => {
    try {
      const { updated } = await adminApi.readAllNotices({
        important: tab === "important" ? true : undefined,
        category,
      });
      toast.success(
        updated
          ? `Đã đánh dấu ${updated} thông báo là đã đọc`
          : "Không còn thông báo chưa đọc",
      );
      list.reload();
      void refreshNoticeCounts();
    } catch (err) {
      toast.error(errorMessage(err, "Chưa cập nhật được"));
    }
  };

  const clearRead = async () => {
    const ok = await confirm({
      title: "Xóa các thông báo đã đọc?",
      message:
        "Các thông báo đã đọc sẽ bị xóa khỏi danh sách, không khôi phục được. Thông báo chưa đọc được giữ lại.",
      confirmLabel: "Xóa",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await adminApi.deleteReadNotices();
      toast.success("Đã xóa các thông báo đã đọc");
      list.reload();
    } catch (err) {
      toast.error(errorMessage(err, "Chưa xóa được"));
    }
  };

  const filterChange = (patch: Partial<{ tab: string; cat: string }>) =>
    setUrl({ ...patch, page: "1" });

  return (
    <>
      {confirmDialog}
      <PageHeader
        eyebrow="Quản trị"
        title="Thông báo"
        description="Hành vi của người dùng: đăng ký, lấy đề, nạp tiền, báo lỗi… Mục Quan trọng là những việc admin nên nắm."
        action={
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outlined"
              onClick={() => void readAll()}
              disabled={counts.unread === 0}
            >
              <CheckCheck size={16} /> Đọc hết
            </Button>
            <Button variant="text" onClick={() => void clearRead()}>
              <Trash2 size={16} /> Xóa đã đọc
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          label="Lọc thông báo"
          value={tab}
          onChange={(v) => filterChange({ tab: v })}
          options={[
            {
              value: "unread",
              label: `Chưa đọc${counts.unread ? ` (${counts.unread})` : ""}`,
            },
            {
              value: "important",
              label: `Quan trọng${counts.importantUnread ? ` (${counts.importantUnread})` : ""}`,
            },
            { value: "all", label: "Tất cả" },
          ]}
        />
        <select
          value={url.cat}
          onChange={(e) => filterChange({ cat: e.target.value })}
          aria-label="Lọc theo nhóm"
          className={`${inputClass()} !h-10 w-auto min-w-44`}
        >
          <option value="all">Mọi nhóm</option>
          {(Object.keys(CATEGORY_LABEL) as NoticeCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
              {counts.categories[c]
                ? ` (${counts.categories[c]} chưa đọc)`
                : ""}
            </option>
          ))}
        </select>
      </div>

      <Card>
        {list.loading && !list.data ? (
          <Loading />
        ) : list.error ? (
          <ErrorBox message={list.error} onRetry={list.reload} />
        ) : list.data && list.data.items.length > 0 ? (
          <>
            <ul className="divide-y divide-outline-variant">
              {list.data.items.map((n) => (
                <NoticeRow
                  key={n.id}
                  n={n}
                  busy={busy === n.id}
                  onToggle={() => void toggle(n)}
                />
              ))}
            </ul>
            <Pagination
              meta={list.data.meta}
              onPage={(p) => setUrl({ page: String(p) })}
            />
          </>
        ) : (
          <Empty
            icon={Bell}
            title={
              tab === "unread"
                ? "Không còn thông báo chưa đọc"
                : "Chưa có thông báo nào"
            }
          />
        )}
      </Card>
    </>
  );
}
