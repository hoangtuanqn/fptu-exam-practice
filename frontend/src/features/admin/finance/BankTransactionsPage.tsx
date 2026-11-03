import { Landmark } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { BankTxBadge } from "@/shared/components/StatusBadge";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { useApi } from "@/shared/hooks/useApi";
import type { BankTxStatus } from "@/shared/types/api";
import { formatDateTime, formatMoney } from "@/shared/utils/formatters";
import { useClampPage } from "@/shared/hooks/useClampPage";

export default function BankTransactionsPage() {
  const [url, setUrl] = useUrlState({ status: "", page: "1" });
  const status = url.status as BankTxStatus | "";
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const setStatus = (v: BankTxStatus | "") => setUrl({ status: v, page: "1" });

  const { data, error, loading, reload } = useApi(() => adminApi.bankTransactions(page, status), [page, status]);
  useClampPage(data?.meta, setPage);

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
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((t) => (
                <li key={t.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-emerald-700">+{formatMoney(t.amountIn)}</span>
                    <BankTxBadge value={t.status} />
                  </div>
                  <div className="mt-1 break-words text-xs text-slate-700">{t.content || "—"}</div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    {t.gateway ?? "—"} · {formatDateTime(t.transactionAt)}
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
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
            </div>
            <Pagination meta={data.meta} onPage={setPage} />
          </>
        ) : (
          <Empty icon={Landmark} title="Chưa có giao dịch nào" />
        )}
      </Card>
    </>
  );
}
