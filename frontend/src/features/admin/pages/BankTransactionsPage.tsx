import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { BankTxBadge } from "@/shared/components/StatusBadge";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { useApi } from "@/shared/hooks/useApi";
import type { BankTxStatus } from "@/shared/types/api";
import { formatDateTime, formatMoney } from "@/shared/utils/formatters";

export default function BankTransactionsPage() {
  const [status, setStatus] = useState<BankTxStatus | "">("");
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [status]);

  const { data, error, loading, reload } = useApi(() => adminApi.bankTransactions(page, status), [page, status]);

  return (
    <>
      <PageHeader
        title="Giao dịch ngân hàng"
        description="Tiền vào lấy từ SePay. Giao dịch “Chưa khớp” không có mã nạp hợp lệ, hãy đối chiếu rồi cộng tiền thủ công ở trang Thành viên."
      />
      <Card>
        <div className="border-b border-slate-100 p-4">
          <Segmented
            label="Lọc theo trạng thái"
            value={status}
            onChange={setStatus}
            options={[
              { value: "", label: "Tất cả" },
              { value: "UNMATCHED", label: "Chưa khớp" },
              { value: "MATCHED", label: "Đã khớp" },
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
                <Th>Thời gian</Th>
                <Th>Nội dung chuyển khoản</Th>
                <Th>Ngân hàng</Th>
                <Th className="text-right">Số tiền</Th>
                <Th>Trạng thái</Th>
              </Thead>
              <tbody>
                {data.items.map((t) => (
                  <Tr key={t.id}>
                    <Td className="whitespace-nowrap text-slate-500">{formatDateTime(t.transactionAt)}</Td>
                    <Td className="max-w-xs break-words text-xs">{t.content || "—"}</Td>
                    <Td>{t.gateway ?? "—"}</Td>
                    <Td className="text-right font-medium tabular-nums text-emerald-700">+{formatMoney(t.amountIn)}</Td>
                    <Td><BankTxBadge value={t.status} /></Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        ) : (
          <Empty icon={Landmark} title="Chưa có giao dịch nào" />
        )}
      </Card>
    </>
  );
}
