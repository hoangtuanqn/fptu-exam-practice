import { Receipt } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { DepositStatusBadge } from "@/shared/components/StatusBadge";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { useApi } from "@/shared/hooks/useApi";
import type { DepositStatus } from "@/shared/types/api";
import { formatDateTime, formatMoney } from "@/shared/utils/formatters";
import { useClampPage } from "@/shared/hooks/useClampPage";

export default function DepositsPage() {
  const [url, setUrl] = useUrlState({ status: "", page: "1" });
  const status = url.status as DepositStatus | "";
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const setStatus = (v: DepositStatus | "") => setUrl({ status: v, page: "1" });

  const { data, error, loading, reload } = useApi(() => adminApi.deposits(page, status), [page, status]);
  useClampPage(data?.meta, setPage);

  return (
    <>
      <PageHeader title="Lệnh nạp tiền" description="Tất cả lệnh nạp do thành viên tạo." />
      <Card>
        <div className="border-b border-slate-100 p-4">
          <Segmented
            label="Lọc theo trạng thái"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "Tất cả" },
              { value: "PENDING", label: "Chờ thanh toán" },
              { value: "PAID", label: "Đã thanh toán" },
              { value: "EXPIRED", label: "Hết hạn" },
            ]}
          />
        </div>

        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && data.items.length > 0 ? (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((o) => (
                <li key={o.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-700">{o.code}</span>
                    <DepositStatusBadge value={o.status} />
                  </div>
                  <div className="mt-1 flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-slate-900">{o.user?.fullName}</span>
                    <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums">{formatMoney(o.amount)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">{o.user?.email}</div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {formatDateTime(o.createdAt)}{o.paidAt ? ` · thanh toán ${formatDateTime(o.paidAt)}` : ""}
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
              <Thead>
                <Th>Mã nạp</Th>
                <Th>Thành viên</Th>
                <Th className="text-right">Số tiền</Th>
                <Th>Trạng thái</Th>
                <Th>Tạo lúc</Th>
                <Th>Thanh toán lúc</Th>
              </Thead>
              <tbody>
                {data.items.map((o) => (
                  <Tr key={o.id}>
                    <Td className="text-xs">{o.code}</Td>
                    <Td>
                      <div className="font-medium text-slate-800">{o.user?.fullName}</div>
                      <div className="text-xs text-slate-500">{o.user?.email}</div>
                    </Td>
                    <Td className="text-right tabular-nums">{formatMoney(o.amount)}</Td>
                    <Td><DepositStatusBadge value={o.status} /></Td>
                    <Td className="whitespace-nowrap text-slate-500">{formatDateTime(o.createdAt)}</Td>
                    <Td className="whitespace-nowrap text-slate-500">{o.paidAt ? formatDateTime(o.paidAt) : "—"}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            </div>
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        ) : (
          <Empty icon={Receipt} title="Chưa có lệnh nạp nào" />
        )}
      </Card>
    </>
  );
}
