import { useEffect, useState } from "react";
import { Landmark } from "lucide-react";
import { adminApi } from "../../api/admin.api";
import { BankTxBadge } from "../../components/common/StatusBadge";
import { Card, PageHeader } from "../../components/ui/Card";
import { Empty, ErrorBox, Loading } from "../../components/ui/Feedback";
import { inputClass } from "../../components/ui/Input";
import { Pagination, Table, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { useApi } from "../../hooks/useApi";
import type { BankTxStatus } from "../../types/api";
import { formatDateTime, formatMoney } from "../../utils/formatters";

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
          <select value={status} onChange={(e) => setStatus(e.target.value as BankTxStatus | "")} aria-label="Lọc theo trạng thái" className={`${inputClass()} !w-auto`}>
            <option value="">Tất cả</option>
            <option value="UNMATCHED">Chưa khớp</option>
            <option value="MATCHED">Đã khớp</option>
          </select>
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
