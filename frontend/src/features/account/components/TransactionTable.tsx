import { Receipt } from "lucide-react";
import type { WalletTransaction } from "@/shared/types/api";
import { formatDateTime, formatMoney, formatSigned } from "@/shared/utils/formatters";
import { TRANSACTION_LABEL } from "@/shared/components/StatusBadge";
import { Empty } from "@/shared/ui/Feedback";
import { Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";

// Lịch sử biến động số dư: dùng ở trang tổng quan (vài dòng gần nhất) và trang giao dịch (đầy đủ).
// Điện thoại: mỗi giao dịch là một dòng gọn (nội dung bên trái, số tiền bên phải); máy tính: bảng.
export function TransactionTable({ items }: { items: WalletTransaction[] }) {
  if (items.length === 0) return <Empty icon={Receipt} title="Chưa có giao dịch nào" />;

  return (
    <>
      <ul className="divide-y divide-slate-100 md:hidden">
        {items.map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-800">{TRANSACTION_LABEL[t.type]}</div>
              {t.note && <div className="truncate text-xs text-slate-500">{t.note}</div>}
              <div className="mt-0.5 text-xs text-slate-400">{formatDateTime(t.createdAt)}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className={`whitespace-nowrap text-sm font-semibold tabular-nums ${t.amount >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                {formatSigned(t.amount)}
              </div>
              <div className="whitespace-nowrap text-xs tabular-nums text-slate-400">{formatMoney(t.balanceAfter)}</div>
            </div>
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <Table>
          <Thead>
            <Th>Thời gian</Th>
            <Th>Nội dung</Th>
            <Th className="text-right">Số tiền</Th>
            <Th className="text-right">Số dư sau</Th>
          </Thead>
          <tbody>
            {items.map((t) => (
              <Tr key={t.id}>
                <Td className="whitespace-nowrap text-slate-500">{formatDateTime(t.createdAt)}</Td>
                <Td>
                  <div className="font-medium text-slate-800">{TRANSACTION_LABEL[t.type]}</div>
                  {t.note && <div className="text-xs text-slate-500">{t.note}</div>}
                </Td>
                <Td className={`whitespace-nowrap text-right font-medium tabular-nums ${t.amount >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                  {formatSigned(t.amount)}
                </Td>
                <Td className="whitespace-nowrap text-right tabular-nums text-slate-500">{formatMoney(t.balanceAfter)}</Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );
}
