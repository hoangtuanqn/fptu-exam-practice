import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { useUrlState, toPage } from "@/shared/hooks/useUrlState";
import { errorMessage } from "@/shared/api/errors";
import { Card, CardHeader } from "@/shared/ui/Card";
import { Button } from "@/shared/ui/Button";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { Segmented } from "@/shared/ui/Segmented";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { Empty, FormError } from "@/shared/ui/Feedback";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { formatCredit, formatDateTime } from "@/shared/utils/formatters";
import { useAuth } from "@/features/auth/AuthContext";
import { courseraApi, ORDER_LABELS, type CourseraOrder, type OrderStatus } from "./coursera.api";
import { AdminOrderDialog } from "./AdminOrderDialog";

const STATUS_TONE: Record<OrderStatus, Tone> = {
  PENDING: "warning",
  PROCESSING: "info",
  COMPLETED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

const STATUS_OPTIONS: { value: OrderStatus | ""; label: string }[] = [
  { value: "", label: "Tất cả" },
  ...(Object.keys(ORDER_LABELS) as OrderStatus[]).map((value) => ({ value, label: ORDER_LABELS[value] })),
];

function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{ORDER_LABELS[status]}</Badge>;
}

// Số tiền đã thu và trạng thái hoàn; backend cũ chưa gửi amount thì hiện gạch ngang
function Amount({ order }: { order: CourseraOrder }) {
  if (order.amount === undefined) return <>—</>;
  return (
    <>
      <div className="font-medium tabular-nums text-on-surface">{formatCredit(order.amount)}</div>
      {order.refundedAt && <div className="md-body-small text-success">Đã hoàn {formatCredit(order.amount)}</div>}
    </>
  );
}

function Notes({ order }: { order: CourseraOrder }) {
  return (
    <>
      {order.note && <p className="md-body-small whitespace-pre-wrap break-words text-on-surface-variant">Ghi chú: {order.note}</p>}
      {order.adminNote && <p className="md-body-small whitespace-pre-wrap break-words text-primary">Phản hồi: {order.adminNote}</p>}
    </>
  );
}

export function OrderHistory({ revision = 0, admin = false }: { revision?: number; admin?: boolean }) {
  const { refresh } = useAuth();
  const [url, setUrl] = useUrlState({ orderPage: "1", status: "" });
  const status = Object.prototype.hasOwnProperty.call(ORDER_LABELS, url.status) ? (url.status as OrderStatus) : undefined;
  const page = toPage(url.orderPage);
  const query = useApi(() => courseraApi.orders(page, status, admin), [page, status, revision, admin]);
  const [selected, setSelected] = useState<CourseraOrder | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { confirm, confirmDialog } = useConfirm();

  async function cancel(order: CourseraOrder) {
    setBusy(true);
    try {
      const refund = order.amount ? ` Bạn sẽ được hoàn ${formatCredit(order.amount)} vào ví.` : "";
      const ok = await confirm({
        title: `Hủy đơn #${order.id}?`,
        message: `Đơn sẽ dừng xử lý và thông tin mật khẩu sẽ được xóa.${refund}`,
        confirmLabel: "Hủy đơn",
        tone: "danger",
      });
      if (!ok) return;
      setError("");
      await courseraApi.cancel(order.id);
      await refresh();
      query.reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const action = (order: CourseraOrder) => {
    if (admin) {
      return (
        <Button size="sm" disabled={query.loading} onClick={() => setSelected(order)}>
          Xử lý đơn
        </Button>
      );
    }
    if (order.status !== "PENDING") return null;
    return (
      <Button size="sm" disabled={busy || query.loading} onClick={() => void cancel(order)}>
        Hủy đơn
      </Button>
    );
  };

  const meta = (order: CourseraOrder) => `${formatDateTime(order.createdAt)}${admin ? ` · Thành viên #${order.userId}` : ""}`;

  return (
    <Card>
      <CardHeader
        title={admin ? "Đơn Coursera" : "Lịch sử đặt đơn"}
        action={
          <Button size="sm" onClick={query.reload} disabled={query.loading}>
            Tải lại
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-3 border-b border-outline-variant p-4">
        <Segmented
          label="Lọc theo trạng thái"
          value={status ?? ""}
          options={STATUS_OPTIONS}
          onChange={(value) => setUrl({ status: value, orderPage: "1" })}
        />
      </div>
      {error && (
        <div className="px-4 pt-4">
          <FormError message={error} />
        </div>
      )}
      <QueryBoundary query={query}>
        {(data) =>
          data.items.length > 0 ? (
            <>
              <ul className="divide-y divide-outline-variant md:hidden">
                {data.items.map((order) => (
                  <li key={order.id} className="space-y-2 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="md-title-small break-words text-on-surface">
                          #{order.id} · {order.courseTitle}
                        </div>
                        <div className="md-body-small text-on-surface-variant">{meta(order)}</div>
                      </div>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <div className="md-body-small break-all text-on-surface-variant">{order.email}</div>
                    <div className="md-body-medium">
                      <Amount order={order} />
                    </div>
                    <Notes order={order} />
                    {action(order)}
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <Table>
                  <Thead>
                    <Th>Đơn</Th>
                    <Th>Trạng thái</Th>
                    <Th className="text-right">Phí</Th>
                    <Th>Ngày đặt</Th>
                    <Th className="text-right">
                      <span className="sr-only">Thao tác</span>
                    </Th>
                  </Thead>
                  <tbody>
                    {data.items.map((order) => (
                      <Tr key={order.id}>
                        <Td className="max-w-md space-y-1">
                          <div className="break-words font-medium text-on-surface">
                            #{order.id} · {order.courseTitle}
                          </div>
                          <div className="md-body-small break-all text-on-surface-variant">
                            {order.email}
                            {admin ? ` · Thành viên #${order.userId}` : ""}
                          </div>
                          <Notes order={order} />
                        </Td>
                        <Td>
                          <OrderStatusBadge status={order.status} />
                        </Td>
                        <Td className="whitespace-nowrap text-right">
                          <Amount order={order} />
                        </Td>
                        <Td className="whitespace-nowrap text-on-surface-variant">{formatDateTime(order.createdAt)}</Td>
                        <Td className="text-right">{action(order)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <Pagination meta={data.meta} onPage={(value) => setUrl({ orderPage: String(value) })} />
            </>
          ) : (
            <Empty icon={ShoppingBag} title="Chưa có đơn hàng" />
          )
        }
      </QueryBoundary>
      {selected && (
        <AdminOrderDialog
          order={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            query.reload();
          }}
        />
      )}
      {confirmDialog}
    </Card>
  );
}
