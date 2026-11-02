import { useState, type FormEvent } from "react";
import { Loader2, Plus } from "lucide-react";
import { depositApi } from "../../api/deposit.api";
import { DepositStatusBadge } from "../../components/common/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Card, CardHeader, PageHeader } from "../../components/ui/Card";
import { Empty, ErrorBox, FormError, Loading } from "../../components/ui/Feedback";
import { Input } from "../../components/ui/Input";
import { Pagination, Table, Td, Th, Thead, Tr } from "../../components/ui/Table";
import { PaymentPanel } from "../../components/wallet/PaymentPanel";
import { useApi } from "../../hooks/useApi";
import { useSubmit } from "../../hooks/useSubmit";
import { formatDateTime, formatMoney } from "../../utils/formatters";

const PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000];

export default function DepositPage() {
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [digits, setDigits] = useState(""); // chỉ giữ chữ số, hiển thị có dấu chấm ngăn cách
  const { run, loading, error, fieldErrors } = useSubmit();

  const info = useApi(() => depositApi.info(), []);
  const orders = useApi(() => depositApi.list(page), [page]);

  const amount = Number(digits || 0);
  const min = info.data?.minDeposit ?? 0;
  const tooLow = digits !== "" && amount < min;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => setActiveId((await depositApi.create(amount)).order.id));
  };

  const closePayment = () => {
    setActiveId(null);
    setDigits("");
    orders.reload();
  };

  return (
    <>
      <PageHeader title="Nạp tiền" description="Chuyển khoản ngân hàng, tiền được cộng tự động sau ít phút." />

      {activeId !== null ? (
        <PaymentPanel id={activeId} onClose={closePayment} />
      ) : info.loading ? (
        <Loading />
      ) : info.error ? (
        <ErrorBox message={info.error} onRetry={info.reload} />
      ) : (
        <Card>
          <CardHeader title="Tạo lệnh nạp" description={`Tối thiểu ${formatMoney(min)} · lệnh có hiệu lực ${info.data?.orderExpireMinutes} phút`} />
          <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
            <FormError message={error} />
            <Input
              label="Số tiền (₫)"
              inputMode="numeric"
              value={digits ? Number(digits).toLocaleString("vi-VN") : ""}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 9))}
              error={fieldErrors.amount ?? (tooLow ? `Tối thiểu ${formatMoney(min)}` : undefined)}
              placeholder="Ví dụ: 100.000"
            />
            <div className="flex flex-wrap gap-2">
              {PRESETS.filter((p) => p >= min).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDigits(String(p))}
                  className={`rounded-lg border px-3 py-1.5 text-sm tabular-nums transition ${
                    amount === p ? "border-brand-700 bg-brand-50 text-brand-900" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p.toLocaleString("vi-VN")}
                </button>
              ))}
            </div>
            <Button variant="primary" type="submit" disabled={loading || !digits || tooLow}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Tạo lệnh nạp
            </Button>
          </form>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader title="Lệnh nạp gần đây" />
        {orders.loading && !orders.data ? (
          <Loading />
        ) : orders.error ? (
          <ErrorBox message={orders.error} onRetry={orders.reload} />
        ) : orders.data && orders.data.items.length > 0 ? (
          <>
            <Table>
              <Thead>
                <Th>Mã nạp</Th>
                <Th>Tạo lúc</Th>
                <Th className="text-right">Số tiền</Th>
                <Th>Trạng thái</Th>
                <Th />
              </Thead>
              <tbody>
                {orders.data.items.map((o) => (
                  <Tr key={o.id}>
                    <Td className="font-mono text-xs">{o.code}</Td>
                    <Td className="whitespace-nowrap text-slate-500">{formatDateTime(o.createdAt)}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(o.amount)}</Td>
                    <Td>
                      <DepositStatusBadge value={o.status} />
                    </Td>
                    <Td className="text-right">
                      {o.status === "PENDING" && new Date(o.expiresAt) > new Date() && (
                        <Button size="sm" onClick={() => setActiveId(o.id)}>
                          Thanh toán
                        </Button>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            <Pagination meta={orders.data.meta} onPage={setPage} />
          </>
        ) : (
          <Empty title="Chưa có lệnh nạp nào" />
        )}
      </Card>
    </>
  );
}
