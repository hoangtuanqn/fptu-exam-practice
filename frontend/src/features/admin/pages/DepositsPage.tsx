import { useEffect, useState } from "react";
import { Receipt } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { DepositStatusBadge } from "@/shared/components/StatusBadge";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { useApi } from "@/shared/hooks/useApi";
import type { DepositStatus } from "@/shared/types/api";
import { formatDateTime, formatMoney } from "@/shared/utils/formatters";

export default function DepositsPage() {
  const [status, setStatus] = useState<DepositStatus | "">("");
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [status]);

  const { data, error, loading, reload } = useApi(() => adminApi.deposits(page, status), [page, status]);

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
                    <Td className="font-mono text-xs">{o.code}</Td>
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
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        ) : (
          <Empty icon={Receipt} title="Chưa có lệnh nạp nào" />
        )}
      </Card>
    </>
  );
}
