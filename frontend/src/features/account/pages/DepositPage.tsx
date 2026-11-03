import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Plus } from "lucide-react";
import { depositApi } from "@/features/account/api/deposit.api";
import { DepositStatusBadge } from "@/shared/components/StatusBadge";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, FormError, Loading } from "@/shared/ui/Feedback";
import { Input } from "@/shared/ui/Input";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { PaymentPanel } from "@/features/account/components/PaymentPanel";
import { useApi } from "@/shared/hooks/useApi";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { formatDateTime, formatMoney } from "@/shared/utils/formatters";

const PRESETS = [50_000, 100_000, 200_000, 500_000, 1_000_000];

export default function DepositPage() {
  // Mỗi lệnh nạp có địa chỉ riêng /account/deposit/:code: sao chép gửi đi hoặc mở lại đều đúng lệnh đó
  const navigate = useNavigate();
  const { code: activeCode } = useParams(); // mã nạp (ngẫu nhiên), không dùng ID tăng dần để khỏi lộ số lượng lệnh
  const [url, setUrl] = useUrlState({ page: "1" });
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const [digits, setDigits] = useState(""); // chỉ giữ chữ số, hiển thị có dấu chấm ngăn cách
  const { run, loading, error, fieldErrors } = useSubmit();

  const info = useApi(() => depositApi.info(), []);
  const orders = useApi(() => depositApi.list(page), [page]);

  const amount = Number(digits || 0);
  const min = info.data?.minDeposit ?? 0;
  const tooLow = digits !== "" && amount < min;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => navigate(`/account/deposit/${(await depositApi.create(amount)).order.code}`));
  };

  const closePayment = () => {
    navigate("/account/deposit");
    setDigits("");
    orders.reload();
  };

  return (
    <>
      <PageHeader title="Nạp credit" description="Chuyển khoản ngân hàng (1 ₫ = 1 credit), credit được cộng tự động sau ít phút." />

      {activeCode ? (
        <PaymentPanel code={activeCode} onClose={closePayment} />
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
            <ul className="divide-y divide-slate-100 md:hidden">
              {orders.data.items.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs text-slate-700">{o.code}</span>
                      <DepositStatusBadge value={o.status} />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      <span className="font-medium tabular-nums text-slate-800">{formatMoney(o.amount)}</span> · {formatDateTime(o.createdAt)}
                    </div>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/account/deposit/${o.code}`)}>
                    {o.status === "PENDING" && new Date(o.expiresAt) > new Date() ? "Thanh toán" : "Chi tiết"}
                  </Button>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
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
                    <Td className="text-xs">{o.code}</Td>
                    <Td className="whitespace-nowrap text-slate-500">{formatDateTime(o.createdAt)}</Td>
                    <Td className="text-right tabular-nums">{formatMoney(o.amount)}</Td>
                    <Td>
                      <DepositStatusBadge value={o.status} />
                    </Td>
                    <Td className="text-right">
                      <Button size="sm" onClick={() => navigate(`/account/deposit/${o.code}`)}>
                        {o.status === "PENDING" && new Date(o.expiresAt) > new Date() ? "Thanh toán" : "Chi tiết"}
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
            </div>
            <Pagination meta={orders.data.meta} onPage={setPage} />
          </>
        ) : (
          <Empty title="Chưa có lệnh nạp nào" />
        )}
      </Card>
    </>
  );
}
