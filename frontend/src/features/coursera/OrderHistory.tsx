import { useState } from "react";
import { useApi } from "@/shared/hooks/useApi";
import { useUrlState, toPage } from "@/shared/hooks/useUrlState";
import { errorMessage } from "@/shared/api/errors";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Empty, FormError } from "@/shared/ui/Feedback";
import { Pagination } from "@/shared/ui/Table";
import { Select } from "@/shared/ui/Input";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { courseraApi, ORDER_LABELS, type CourseraOrder, type OrderStatus } from "./coursera.api";
import { AdminOrderDialog } from "./AdminOrderDialog";

export function OrderHistory({ revision = 0, admin = false }: { revision?: number; admin?: boolean }) {
  const [url, setUrl] = useUrlState({ orderPage: "1", status: "" });
  const status = Object.prototype.hasOwnProperty.call(ORDER_LABELS, url.status) ? url.status as OrderStatus : undefined;
  const page = toPage(url.orderPage);
  const query = useApi(() => courseraApi.orders(page, status, admin), [page, status, revision, admin]);
  const [selected, setSelected] = useState<CourseraOrder | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { confirm, confirmDialog } = useConfirm();
  async function cancel(order: CourseraOrder) {
    setBusy(true);
    try {
      if (!await confirm({ title: `Hủy đơn #${order.id}?`, message: "Đơn sẽ dừng xử lý và thông tin mật khẩu sẽ được xóa.", confirmLabel: "Hủy đơn", tone: "danger" })) return;
      setError(""); await courseraApi.cancel(order.id); query.reload();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <Card>
    <CardHeader title={admin ? "Đơn Coursera" : "Lịch sử đặt đơn"} action={<Button onClick={query.reload} disabled={query.loading}>Tải lại</Button>} />
    <div className="space-y-4 p-5">
      <Select label="Trạng thái" value={status ?? ""} onChange={(e) => setUrl({ status: e.target.value, orderPage: "1" })}>
        <option value="">Tất cả</option>{Object.entries(ORDER_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </Select>
      <FormError message={error} />
      <QueryBoundary query={query}>{(data) => <>
        {data.items.length ? <div className="space-y-4">{data.items.map((order) => <article key={order.id} className="space-y-2 rounded-m3-sm border border-outline-variant p-4">
          <div className="flex flex-wrap justify-between gap-2"><h3 className="md-title-medium break-words">#{order.id} · {order.courseTitle}</h3><span className="md-label-large text-primary">{ORDER_LABELS[order.status]}</span></div>
          <p className="md-body-small text-on-surface-variant">{new Date(order.createdAt).toLocaleString("vi-VN")}{admin ? ` · Thành viên #${order.userId}` : ""}</p>
          <p className="break-all">{order.email}</p>
          {order.note && <p className="whitespace-pre-wrap break-words">Ghi chú: {order.note}</p>}
          {order.adminNote && <p className="whitespace-pre-wrap break-words text-primary">Phản hồi: {order.adminNote}</p>}
          {admin ? <Button disabled={query.loading} onClick={() => setSelected(order)}>Xử lý đơn</Button> : order.status === "PENDING" && <Button disabled={busy || query.loading} onClick={() => void cancel(order)}>Hủy đơn</Button>}
        </article>)}</div> : <Empty title="Chưa có đơn hàng" />}
        <Pagination meta={data.meta} onPage={(value) => setUrl({ orderPage: String(value) })} />
      </>}</QueryBoundary>
    </div>
    {selected && <AdminOrderDialog order={selected} onClose={() => setSelected(null)} onSaved={() => { setSelected(null); query.reload(); }} />}
    {confirmDialog}
  </Card>;
}
