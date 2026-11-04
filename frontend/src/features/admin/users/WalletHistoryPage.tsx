import { useEffect, useState } from "react";
import { Search, Wallet } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { UserCell, UserFilterChip } from "@/features/admin/shared";
import { TRANSACTION_LABEL } from "@/shared/components/StatusBadge";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import type { TransactionType } from "@/shared/types/api";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { inputClass } from "@/shared/ui/Input";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatCredit, formatCreditSigned, formatDateTime } from "@/shared/utils/formatters";

const amountClass = (n: number) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-rose-600" : "text-slate-600");

// Biến động số dư của mọi thành viên: ai được cộng/trừ bao nhiêu, vì sao, số dư sau đó
export default function WalletHistoryPage() {
  const [url, setUrl] = useUrlState({ q: "", type: "", userId: "", page: "1" });
  const type = url.type as TransactionType | "";
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });

  // Ô tìm kiếm gõ trực tiếp, sau khi ngừng gõ mới đưa lên URL (và về trang 1)
  const [search, setSearch] = useState(url.q);
  const q = useDebounce(search.trim());
  useEffect(() => {
    if (q !== url.q) setUrl({ q, page: "1" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const { data, error, loading, reload } = useApi(
    () => adminApi.walletTransactions({ page, search: q, type, userId: url.userId }),
    [page, q, type, url.userId],
  );
  useClampPage(data?.meta, setPage);
  const who = url.userId ? data?.items[0]?.user : undefined;

  return (
    <>
      <PageHeader title="Biến động số dư" description="Mọi lần cộng/trừ credit của thành viên: nạp tiền, phí, hoàn phí, thưởng, điều chỉnh." />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-52 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc email" aria-label="Tìm thành viên" className={`${inputClass()} pl-9`} />
          </div>
          <select
            aria-label="Lọc theo loại giao dịch"
            value={type}
            onChange={(e) => setUrl({ type: e.target.value, page: "1" })}
            className={`${inputClass()} w-auto`}
          >
            <option value="">Mọi loại giao dịch</option>
            {(Object.keys(TRANSACTION_LABEL) as TransactionType[]).map((t) => (
              <option key={t} value={t}>
                {TRANSACTION_LABEL[t]}
              </option>
            ))}
          </select>
          <UserFilterChip userId={url.userId} label={who?.fullName} onClear={() => setUrl({ userId: "", page: "1" })} />
        </div>

        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && data.items.length > 0 ? (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((t) => (
                <li key={t.id} className="px-4 py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-slate-900">{TRANSACTION_LABEL[t.type]}</span>
                    <span className={`shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums ${amountClass(t.amount)}`}>{formatCreditSigned(t.amount)}</span>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">
                    {t.user.fullName} · {t.user.email}
                  </div>
                  {t.note && <div className="mt-0.5 text-xs text-slate-500">{t.note}</div>}
                  <div className="mt-0.5 text-xs text-slate-400">
                    {formatDateTime(t.createdAt)} · số dư {formatCredit(t.balanceAfter)}
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <Thead>
                  <Th>Thời gian</Th>
                  <Th>Thành viên</Th>
                  <Th>Loại</Th>
                  <Th className="text-right">Biến động</Th>
                  <Th className="text-right">Số dư sau</Th>
                  <Th>Ghi chú</Th>
                </Thead>
                <tbody>
                  {data.items.map((t) => (
                    <Tr key={t.id}>
                      <Td className="whitespace-nowrap text-slate-500">{formatDateTime(t.createdAt)}</Td>
                      <Td>
                        <UserCell user={t.user} />
                      </Td>
                      <Td className="whitespace-nowrap">{TRANSACTION_LABEL[t.type]}</Td>
                      <Td className={`whitespace-nowrap text-right font-medium tabular-nums ${amountClass(t.amount)}`}>{formatCreditSigned(t.amount)}</Td>
                      <Td className="whitespace-nowrap text-right tabular-nums">{formatCredit(t.balanceAfter)}</Td>
                      <Td className="max-w-xs truncate text-slate-500" title={t.note ?? undefined}>
                        {t.note ?? "—"}
                      </Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination meta={data.meta} onPage={setPage} />
          </div>
        ) : (
          <Empty icon={Wallet} title="Chưa có biến động số dư nào" />
        )}
      </Card>
    </>
  );
}
