import { Receipt } from "lucide-react";
import type { WalletTransaction } from "@/shared/types/api";
import { formatDateTime, formatMoney, formatSigned } from "@/shared/utils/formatters";
import { TRANSACTION_LABEL } from "@/shared/components/StatusBadge";
import { Empty } from "@/shared/ui/Feedback";
import { Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";

// Lịch sử biến động số dư: dùng ở trang tổng quan (vài dòng gần nhất) và trang giao dịch (đầy đủ)
export function TransactionTable({ items }: { items: WalletTransaction[] }) {
  if (items.length === 0) return <Empty icon={Receipt} title="Chưa có giao dịch nào" />;

  return (
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
  );
}
