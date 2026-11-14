import { useState, type FormEvent } from "react";
import { Gift, Hourglass, Loader2 } from "lucide-react";
import { userApi } from "@/features/account/api/user.api";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import type { RedeemResult } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, FormError, Loading } from "@/shared/ui/Feedback";
import { Input } from "@/shared/ui/Input";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatCredit, formatDateTime, timeLeft } from "@/shared/utils/formatters";
import { useClampPage } from "@/shared/hooks/useClampPage";

// Nhập giftcode nhận credit, kèm lịch sử các mã đã nhập
export default function GiftCodePage() {
  const { refresh } = useAuth();
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [code, setCode] = useState("");
  const [result, setResult] = useState<RedeemResult | null>(null);

  const [url, setUrl] = useUrlState({ page: "1" });
  const page = toPage(url.page);
  const history = useApi(() => userApi.myGiftCodes(page), [page]);
  useClampPage(history.data?.meta, (p) => setUrl({ page: String(p) }));
  const lots = useApi(() => userApi.myCreditLots(), []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setResult(null);
    void run(async () => {
      const res = await userApi.redeemGiftCode(code);
      setResult(res);
      setCode("");
      toast.success(`Đã nhận ${formatCredit(res.amount)}`);
      await refresh(); // cập nhật số dư trên thanh bên và header
      if (page !== 1) setUrl({ page: "1" });
      else history.reload();
      lots.reload();
    });
  };

  return (
    <>
      <PageHeader title="Giftcode" description="Nhập mã quà tặng để nhận credit vào ví." />

      <Card>
        <CardHeader title="Nhập mã" description="Mỗi mã chỉ dùng được một lần cho mỗi tài khoản." />
        <form onSubmit={onSubmit} className="space-y-4 p-5" noValidate>
          <FormError message={error} />
          <Input
            label="Giftcode"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            error={fieldErrors.code}
            placeholder="Ví dụ WELCOME2026"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={32}
          />
          <Button variant="primary" type="submit" disabled={loading || code.trim().length < 4}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
            Nhận credit
          </Button>

          {result && (
            <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
              Đã cộng <b>{formatCredit(result.amount)}</b> từ mã <b>{result.code}</b>. Số dư hiện tại: <b>{formatCredit(result.balanceAfter)}</b>.
              {result.creditExpiresAt && (
                <span className="mt-1 block font-medium text-amber-800">
                  Credit này có hạn: dùng trước {formatDateTime(result.creditExpiresAt)} ({timeLeft(result.creditExpiresAt)}), chưa dùng sẽ bị thu hồi.
                </span>
              )}
            </div>
          )}
        </form>
      </Card>

      {lots.data && lots.data.length > 0 && (
        <div className="mt-6">
          <Card>
            <CardHeader title="Credit sắp hết hạn" description="Credit có hạn được dùng trước credit thường. Chưa dùng hết khi tới hạn thì phần còn lại sẽ mất." />
            <ul className="divide-y divide-slate-100">
              {lots.data.map((l) => (
                <li key={l.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Hourglass size={18} className="shrink-0 text-amber-600" />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold tabular-nums text-slate-900">{formatCredit(l.remaining)}</div>
                      <div className="truncate text-xs text-slate-500">{l.note ?? "Giftcode"} · hạn {formatDateTime(l.expiresAt)}</div>
                    </div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800">{timeLeft(l.expiresAt)}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}

      <div className="mt-6">
        <Card>
          <CardHeader title="Mã đã nhập" />
          {history.loading && !history.data ? (
            <Loading />
          ) : history.error ? (
            <ErrorBox message={history.error} onRetry={history.reload} />
          ) : history.data && history.data.items.length > 0 ? (
            <>
              <ul className="divide-y divide-slate-100 md:hidden">
                {history.data.items.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{r.code}</div>
                      <div className="text-xs text-slate-400">{formatDateTime(r.createdAt)}</div>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-emerald-700">+{formatCredit(r.amount)}</span>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <Table>
                  <Thead>
                    <Th>Mã</Th>
                    <Th className="text-right">Credit nhận</Th>
                    <Th>Nhập lúc</Th>
                  </Thead>
                  <tbody>
                    {history.data.items.map((r) => (
                      <Tr key={r.id}>
                        <Td className="font-medium text-slate-800">{r.code}</Td>
                        <Td className="text-right tabular-nums text-emerald-700">+{formatCredit(r.amount)}</Td>
                        <Td className="whitespace-nowrap text-slate-500">{formatDateTime(r.createdAt)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <Pagination meta={history.data.meta} onPage={(p) => setUrl({ page: String(p) })} />
            </>
          ) : (
            <Empty icon={Gift} title="Bạn chưa nhập mã nào" />
          )}
        </Card>
      </div>
    </>
  );
}
