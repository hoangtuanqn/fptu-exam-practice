import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Gift, Loader2, Plus } from "lucide-react";
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
import { formatCredit, formatDateTime, formatMoney } from "@/shared/utils/formatters";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { useUpsell } from "@/shared/hooks/useUpsell";
import { trackPrompt } from "@/shared/utils/trackPrompt";

const PRESETS = [10_000, 50_000, 100_000, 200_000, 500_000, 1_000_000];
const BACK_KEY = "deposit_back";

// 10.000 -> 10K, 1.000.000 -> 1M: nút gợi ý gọn, dễ đọc
const shortMoney = (n: number) => (n >= 1_000_000 && n % 1_000_000 === 0 ? `${n / 1_000_000}M` : n >= 1000 && n % 1000 === 0 ? `${n / 1000}K` : n.toLocaleString("vi-VN"));

// Thưởng thêm theo bậc (bậc cao nhất thỏa điều kiện), khớp với máy chủ
const bonusOf = (amount: number, tiers: { min: number; percent: number }[]) => {
  const tier = [...tiers].sort((a, b) => b.min - a.min).find((t) => amount >= t.min);
  return tier ? Math.floor((amount * tier.percent) / 100) : 0;
};

export default function DepositPage() {
  // Mỗi lệnh nạp có địa chỉ riêng /account/deposit/:code: sao chép gửi đi hoặc mở lại đều đúng lệnh đó
  const navigate = useNavigate();
  const { code: activeCode } = useParams(); // mã nạp (ngẫu nhiên), không dùng ID tăng dần để khỏi lộ số lượng lệnh
  const [url, setUrl] = useUrlState({ page: "1" });
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const [digits, setDigits] = useState(""); // chỉ giữ chữ số, hiển thị có dấu chấm ngăn cách
  const { run, loading, error, fieldErrors } = useSubmit();

  // Người dùng được dẫn sang từ một hộp thoại thiếu credit: biết số còn thiếu và trang để quay lại làm bài (nhớ qua các bước nạp)
  const [search] = useSearchParams();
  const need = Math.max(0, Math.floor(Number(search.get("need")) || 0));
  const backParam = search.get("back");
  const [back, setBack] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(BACK_KEY);
    } catch {
      return null;
    }
  });
  useEffect(() => {
    // Chỉ nhận đường dẫn nội bộ (bắt đầu bằng một dấu /) để không bị dẫn sang trang ngoài
    if (backParam && /^\/(?!\/)/.test(backParam)) {
      setBack(backParam);
      try {
        sessionStorage.setItem(BACK_KEY, backParam);
      } catch {
        /* bỏ qua */
      }
    }
  }, [backParam]);

  const info = useApi(() => depositApi.info(), []);
  const orders = useApi(() => depositApi.list(page), [page]);
  useClampPage(orders.data?.meta, setPage);

  // Lệnh chưa thanh toán còn hiệu lực: nhắc quay lại thanh toán thay vì tạo lệnh mới (tránh chuyển khoản nhầm hoặc nhân đôi)
  const openOrder = orders.data?.items.find((o) => o.status === "PENDING" && new Date(o.expiresAt) > new Date());

  const amount = Number(digits || 0);
  const min = info.data?.minDeposit ?? 0;
  const tooLow = digits !== "" && amount < min;
  const tiers = info.data?.bonusTiers ?? [];
  const bonus = bonusOf(amount, tiers);

  // Bậc thưởng kế tiếp khi chỉ còn thiếu một chút (tối đa 40% mức của bậc). Không gợi ý khi người dùng đang thiếu credit để mua gì đó (need > 0).
  const { flags: upsell } = useUpsell();
  const nextTier = [...tiers].sort((x, y) => x.min - y.min).find((t) => t.min > amount);
  const gap = nextTier ? nextTier.min - amount : 0;
  const showTierGap = upsell.depositTier && need === 0 && !!nextTier && amount > 0 && !tooLow && gap <= nextTier.min * 0.4;
  const tierShownRef = useRef(false);
  useEffect(() => {
    if (!showTierGap || tierShownRef.current) return;
    tierShownRef.current = true; // one "shown" per visit, not on every keystroke
    trackPrompt("deposit-tier", "shown");
  }, [showTierGap]);

  // Điền sẵn số tiền vừa đủ cho phần còn thiếu (làm tròn lên nghìn, không dưới mức tối thiểu)
  useEffect(() => {
    if (need > 0 && info.data && !digits) setDigits(String(Math.max(info.data.minDeposit, Math.ceil(need / 1000) * 1000)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [need, info.data]);

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

      {need > 0 && !activeCode && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Bạn đang thiếu <b>{formatCredit(need)}</b>. {min > need ? `Mức nạp tối thiểu là ${formatMoney(min)}, phần dư vẫn nằm trong ví để dùng tiếp.` : "Mình đã điền sẵn số tiền vừa đủ."} Nạp xong là quay lại {back?.startsWith("/pro") ? "nâng cấp Pro" : "mở khóa"} ngay.
        </div>
      )}
      {openOrder && !activeCode && (
        <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-m3-md bg-secondary-container px-4 py-3 text-on-secondary-container">
          <p className="md-body-medium">
            Bạn còn một lệnh nạp <b className="tabular-nums">{formatMoney(openOrder.amount)}</b> chưa thanh toán. Tiếp tục lệnh này thay vì tạo lệnh mới nhé.
          </p>
          <Button size="sm" variant="tonal" onClick={() => navigate(`/account/deposit/${openOrder.code}`)}>
            Tiếp tục thanh toán
          </Button>
        </div>
      )}
      {back && (
        <Link
          to={back}
          onClick={() => {
            try {
              sessionStorage.removeItem(BACK_KEY);
            } catch {
              /* bỏ qua */
            }
          }}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-900"
        >
          <ArrowLeft size={15} /> {back.startsWith("/pro") ? "Quay lại nâng cấp Pro" : "Quay lại làm bài"}
        </Link>
      )}

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
            {tiers.length > 0 && (
              <div className="space-y-1 text-sm text-slate-600" aria-live="polite">
                {amount > 0 && !tooLow && (
                  <p className="flex items-center gap-1.5 text-slate-800">
                    <Gift size={15} className="shrink-0 text-emerald-600" />
                    Bạn nhận <b className="tabular-nums">{formatCredit(amount + bonus)}</b>
                    {bonus > 0 && <span className="text-emerald-600">(gồm +{bonus.toLocaleString("vi-VN")} thưởng)</span>}
                  </p>
                )}
                {showTierGap && nextTier && (
                  <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-700">
                    <span>
                      Thêm <b className="tabular-nums">{formatMoney(gap)}</b> nữa là được thưởng +{nextTier.percent}% (nhận thêm {(bonusOf(nextTier.min, tiers) - bonus).toLocaleString("vi-VN")} credit).
                    </span>
                    <button type="button" onClick={() => {
                        trackPrompt("deposit-tier", "click");
                        setDigits(String(nextTier.min));
                      }} className="font-semibold text-emerald-700 underline">
                      Nạp {formatMoney(nextTier.min)}
                    </button>
                    <span className="text-slate-500">Không bắt buộc.</span>
                  </p>
                )}
                <details>
                  <summary className="cursor-pointer text-xs text-emerald-700">Nạp nhiều được thưởng thêm credit</summary>
                  <ul className="mt-1 space-y-0.5 text-xs tabular-nums">
                    {[...tiers].sort((x, y) => x.min - y.min).map((t) => (
                      <li key={t.min}>
                        Từ {formatMoney(t.min)}: thưởng +{t.percent}%
                      </li>
                    ))}
                  </ul>
                </details>
              </div>
            )}
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Gợi ý số tiền">
              {PRESETS.filter((p) => p >= min).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setDigits(String(p))}
                  aria-pressed={amount === p}
                  className={`rounded-full border px-3 py-1 text-xs font-medium tabular-nums transition ${
                    amount === p ? "border-brand-700 bg-brand-50 text-brand-900" : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {shortMoney(p)}
                  {bonusOf(p, tiers) > 0 && <span className="ml-1 text-emerald-600">+{shortMoney(bonusOf(p, tiers))}</span>}
                </button>
              ))}
            </div>
            <Button variant="primary" type="submit" disabled={loading || !digits || tooLow}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {loading ? "Đang tạo lệnh…" : amount >= min && amount > 0 ? `Tạo lệnh nạp ${formatMoney(amount)}` : "Tạo lệnh nạp"}
            </Button>
            <p className="md-body-small text-on-surface-variant">Chưa trừ tiền ở bước này. Bạn chỉ chuyển khoản sau khi thấy mã QR và nội dung chuyển.</p>
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
