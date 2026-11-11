import { useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useSubmit } from "@/shared/hooks/useSubmit";
import type { BonusTier, PromoSettings } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { ErrorBox, FormError, Loading } from "@/shared/ui/Feedback";
import { Input, inputClass } from "@/shared/ui/Input";

const pad = (n: number) => String(n).padStart(2, "0");
// ISO -> giá trị cho ô datetime-local (giờ máy người dùng)
const toLocalInput = (iso: string) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}` : "";
};
const digits = (v: string, max: number) => v.replace(/\D/g, "").slice(0, max);

function PromoForm({ initial, explainPrice, onSaved }: { initial: PromoSettings; explainPrice: number; onSaved: () => void }) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [discount, setDiscount] = useState(String(initial.bundleDiscountPercent));
  const [trials, setTrials] = useState(String(initial.freeTrials));
  const [endsAt, setEndsAt] = useState(toLocalInput(initial.promoEndsAt));
  const [upsell, setUpsell] = useState({ result: initial.upsellResult ?? true, reviewCap: initial.upsellReviewCap ?? true, depositTier: initial.upsellDepositTier ?? true, firstRun: initial.upsellFirstRun ?? true });
  const [tiers, setTiers] = useState<{ min: string; percent: string }[]>(initial.depositBonusTiers.map((t) => ({ min: String(t.min), percent: String(t.percent) })));

  const d = Number(discount || 0);
  const sample = Math.round((explainPrice * 50 * (100 - d)) / 100);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const depositBonusTiers: BonusTier[] = tiers.filter((t) => t.min && t.percent).map((t) => ({ min: Number(t.min), percent: Number(t.percent) }));
      await adminApi.savePromoSettings({
        bundleDiscountPercent: d,
        freeTrials: Number(trials || 0),
        promoEndsAt: endsAt ? new Date(endsAt).toISOString() : "",
        depositBonusTiers,
        upsellResult: upsell.result,
        upsellReviewCap: upsell.reviewCap,
        upsellDepositTier: upsell.depositTier,
        upsellFirstRun: upsell.firstRun,
      });
      toast.success("Đã lưu cấu hình ưu đãi");
      onSaved();
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <FormError message={error} />

      <Card>
        <CardHeader title="Mở khóa giải thích cả đề" description="Người dùng trả một lần để xem lời giải thích mọi câu của đề; AI vẫn chỉ chạy khi họ bấm giải thích từng câu." />
        <div className="grid max-w-2xl gap-5 p-5 sm:grid-cols-2">
          <Input
            label="Giảm so với mua lẻ (%)"
            inputMode="numeric"
            value={discount}
            onChange={(e) => setDiscount(digits(e.target.value, 2))}
            error={fieldErrors.bundleDiscountPercent}
            hint={explainPrice > 0 ? `Giá giải thích lẻ hiện là ${explainPrice} credit/câu (chỉnh ở trang AI). Đề 50 câu → gói ${sample.toLocaleString("vi-VN")} credit.` : "0 = không giảm."}
          />
          <Input
            label="Số lượt giải thích miễn phí mỗi tài khoản"
            inputMode="numeric"
            value={trials}
            onChange={(e) => setTrials(digits(e.target.value, 2))}
            error={fieldErrors.freeTrials}
            hint="Tính tổng mọi đề, để người dùng thấy giá trị trước khi trả phí. 0 = không cho dùng thử."
          />
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">Hạn chót ưu đãi (tùy chọn)</span>
            <div className="flex flex-wrap items-center gap-2">
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={`${inputClass(fieldErrors.promoEndsAt)} max-w-xs`} />
              {endsAt && (
                <Button type="button" size="sm" onClick={() => setEndsAt("")}>
                  Bỏ hạn
                </Button>
              )}
            </div>
            <span className="mt-1 block text-xs text-slate-500">
              Đặt hạn thì trang làm bài hiện đồng hồ đếm ngược, và qua hạn thì giá gói về bằng giá mua lẻ (không giảm). Để trống = giảm giá liên tục, không đếm ngược.
            </span>
            {fieldErrors.promoEndsAt && <span className="mt-1 block text-xs text-rose-600">{fieldErrors.promoEndsAt}</span>}
          </label>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Thưởng khi nạp tiền"
          description="Nạp từ mức nào được cộng thêm bao nhiêu % (bậc cao nhất thỏa điều kiện được áp dụng). Hoa hồng giới thiệu vẫn tính trên số tiền nạp thật."
          action={
            tiers.length < 6 ? (
              <Button type="button" size="sm" onClick={() => setTiers((t) => [...t, { min: "", percent: "" }])}>
                <Plus size={14} /> Thêm bậc
              </Button>
            ) : undefined
          }
        />
        <div className="space-y-3 p-5">
          {tiers.length === 0 && <p className="text-sm text-slate-500">Chưa có bậc thưởng nào: nạp bao nhiêu cũng không được thưởng thêm.</p>}
          {tiers.map((t, i) => (
            <div key={i} className="flex flex-wrap items-end gap-3">
              <div className="w-44">
                <Input
                  label={i === 0 ? "Nạp từ (VND)" : undefined}
                  inputMode="numeric"
                  placeholder="100000"
                  value={t.min ? Number(t.min).toLocaleString("vi-VN") : ""}
                  onChange={(e) => setTiers((all) => all.map((x, j) => (j === i ? { ...x, min: digits(e.target.value, 9) } : x)))}
                />
              </div>
              <div className="w-32">
                <Input
                  label={i === 0 ? "Thưởng thêm (%)" : undefined}
                  inputMode="numeric"
                  placeholder="5"
                  value={t.percent}
                  onChange={(e) => setTiers((all) => all.map((x, j) => (j === i ? { ...x, percent: digits(e.target.value, 3) } : x)))}
                />
              </div>
              {t.min && t.percent && (
                <span className="pb-2.5 text-xs text-slate-500">
                  nạp {Number(t.min).toLocaleString("vi-VN")}đ nhận thêm {Math.floor((Number(t.min) * Number(t.percent)) / 100).toLocaleString("vi-VN")} credit
                </span>
              )}
              <Button type="button" size="sm" onClick={() => setTiers((all) => all.filter((_, j) => j !== i))} aria-label="Xóa bậc" title="Xóa bậc" className="mb-0.5">
                <Trash2 size={14} />
              </Button>
            </div>
          ))}
          {fieldErrors.depositBonusTiers && <p className="text-xs text-rose-600">{fieldErrors.depositBonusTiers}</p>}
        </div>
      </Card>

      <Card>
        <CardHeader title="Lời mời nâng cấp và nạp thêm" description="Tắt từng mục là biến mất ngay trên trang người dùng (sau lần tải lại kế tiếp). Mỗi lời mời đều có nút bỏ qua và giới hạn số lần hiện." />
        <div className="space-y-3 p-5">
          {(
            [
              ["result", "Bảng điểm sau khi nộp bài", "Gợi ý gói Pro dựa trên số câu sai, chỉ hiện cho tài khoản chưa có Pro."],
              ["reviewCap", "Sổ câu sai gần đầy", "Báo khi sổ của gói thường đã dùng từ 80% số chỗ."],
              ["depositTier", "Bậc thưởng khi nạp", "Báo số tiền còn thiếu để lên bậc thưởng kế tiếp khi gần tới."],
              ["firstRun", "Danh sách Bắt đầu cho người mới", "Trang chủ hiện 4 bước đầu tiên (xác minh email, lấy đề, nộp bài) cho tới khi người dùng nộp bài đầu tiên."],
            ] as const
          ).map(([k, title, hint]) => (
            <label key={k} className="flex cursor-pointer items-start gap-3">
              <input type="checkbox" className="mt-1 h-4 w-4" checked={upsell[k]} onChange={(e) => setUpsell((u) => ({ ...u, [k]: e.target.checked }))} />
              <span className="text-sm">
                <b className="text-slate-800">{title}</b>
                <span className="block text-xs text-slate-500">{hint}</span>
              </span>
            </label>
          ))}
        </div>
      </Card>

      <Button variant="primary" type="submit" disabled={loading}>
        {loading && <Loader2 size={16} className="animate-spin" />}
        Lưu cấu hình
      </Button>
    </form>
  );
}

// Ưu đãi & khuyến mãi: các con số này lưu trong DB, áp dụng cho trang làm bài, trang nạp tiền và hiển thị ở trang chủ
export default function PromoSettingsPage() {
  const settings = useApi(() => adminApi.promoSettings(), []);
  const ai = useApi(() => adminApi.aiConfig(), []);
  return (
    <>
      <PageHeader title="Ưu đãi & khuyến mãi" description="Chỉnh các con số ưu đãi tại đây: trang chủ, trang làm bài và trang nạp tiền tự cập nhật theo. Số credit tặng khi đăng ký ở “Cấu hình đăng ký”." />
      {settings.data ? (
        <PromoForm key={JSON.stringify(settings.data)} initial={settings.data} explainPrice={ai.data?.explainPrice ?? 0} onSaved={settings.reload} />
      ) : settings.loading ? (
        <Loading />
      ) : (
        <ErrorBox message={settings.error ?? "Không tải được cấu hình"} onRetry={settings.reload} />
      )}
    </>
  );
}
