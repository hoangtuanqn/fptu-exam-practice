import { TriangleAlert } from "lucide-react";
import { formatCredit } from "@/shared/utils/formatters";

interface Props {
  amount: number; // số credit sẽ bị trừ (0 = miễn phí)
  balance: number | null; // số dư hiện tại; null = khách (không có ví)
  freeNote?: string; // lý do miễn phí, hiện dưới con số
}

// Khối tiền của mọi hộp thoại xác nhận trừ credit. Con số bị trừ là to nhất, đỏ, có dấu trừ; số dư chỉ là
// dòng phụ nhỏ màu xám (không dấu trừ, không đậm) để không ai đọc nhầm số dư còn lại thành khoản bị trừ.
export function ChargeSummary({ amount, balance, freeNote }: Props) {
  const free = amount <= 0;
  const short = balance !== null && balance < amount;
  const remaining = balance === null ? null : Math.max(0, balance - amount);

  return (
    <div>
      <div className={`rounded-2xl border px-4 py-4 text-center ${free ? "border-emerald-200 bg-emerald-50" : "border-rose-200 bg-rose-50"}`}>
        <div className={`text-xs font-semibold uppercase tracking-wider ${free ? "text-emerald-700" : "text-rose-700"}`}>{free ? "Phí lần này" : "Bạn sẽ bị trừ"}</div>
        <div className={`mt-1 text-4xl font-bold tabular-nums leading-tight ${free ? "text-emerald-600" : "text-rose-600"}`}>
          {free ? "Miễn phí" : `−${formatCredit(amount)}`}
        </div>
        {free && freeNote && <p className="mt-1.5 text-sm leading-snug text-emerald-800">{freeNote}</p>}
      </div>

      {balance !== null && !free && (
        <dl className="mt-3 space-y-1 px-1 text-sm text-slate-500">
          <div className="flex justify-between gap-3">
            <dt>Số dư hiện tại</dt>
            <dd className="tabular-nums">{formatCredit(balance)}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Còn lại trong ví sau khi trừ</dt>
            <dd className="tabular-nums">{short ? "Không đủ" : formatCredit(remaining ?? 0)}</dd>
          </div>
        </dl>
      )}

      {short && (
        <p className="mt-3 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          <TriangleAlert size={16} className="mt-0.5 shrink-0" />
          Số dư không đủ. Vui lòng nạp thêm credit.
        </p>
      )}
    </div>
  );
}
