import { useState } from "react";
import { Loader2, RotateCcw, SlidersHorizontal } from "lucide-react";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { Button } from "@/shared/ui/Button";
import { useConfirm } from "@/shared/ui/ConfirmDialog";
import { FormError } from "@/shared/ui/Feedback";
import { Input } from "@/shared/ui/Input";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { marketingAdminApi, type MarketingParams, type MarketingParamValues, type ParamKey } from "./marketing.api";

// Mỗi tham số một dòng; tham số dạng mảng có nhiều ô (parts = nhãn từng ô)
const FIELDS: { key: ParamKey; label: string; parts?: string[] }[] = [
  { key: "dailyCap", label: "Hạn mức thư mỗi ngày" },
  { key: "minGapDays", label: "Khoảng cách tối thiểu giữa hai thư (ngày)" },
  { key: "winbackStepDays", label: "Gọi quay lại: số ngày vắng mặt", parts: ["Thư 1", "Thư 2", "Thư 3"] },
  { key: "winbackMaxInactiveDays", label: "Gọi quay lại: bỏ qua người vắng quá (ngày)" },
  { key: "upsellMinPurchases", label: "Gợi ý Pro: số lần mua lẻ tối thiểu" },
  { key: "upsellRepeatDays", label: "Gợi ý Pro: số ngày chờ trước khi gợi ý lại" },
  { key: "expiryStepDays", label: "Nhắc gia hạn: báo trước (ngày)", parts: ["Thư 1", "Thư 2"] },
];

type Form = Record<ParamKey, string[]>;
type Errors = Partial<Record<ParamKey, string>>;

const toForm = (v: MarketingParamValues): Form =>
  Object.fromEntries(FIELDS.map((f) => [f.key, ([] as number[]).concat(v[f.key]).map(String)])) as Form;

// Cùng luật với backend: số nguyên trong khoảng, mốc gọi quay lại tăng dần, ngưỡng vắng lớn hơn mốc cuối, mốc nhắc gia hạn giảm dần
function validate(form: Form, limits: MarketingParams["limits"]): { errors: Errors; values: MarketingParamValues } {
  const errors: Errors = {};
  const nums = Object.fromEntries(FIELDS.map((f) => [f.key, form[f.key].map((s) => (s.trim() === "" ? NaN : Number(s)))])) as Record<ParamKey, number[]>;
  for (const f of FIELDS) {
    const lim = limits[f.key];
    if (nums[f.key].some((n) => !Number.isInteger(n))) errors[f.key] = "Nhập số nguyên";
    else if (lim && nums[f.key].some((n) => n < lim.min || n > lim.max)) errors[f.key] = `Trong khoảng ${lim.min} đến ${lim.max}`;
  }
  const wb = nums.winbackStepDays;
  if (!errors.winbackStepDays && wb.some((n, i) => i > 0 && n <= wb[i - 1]!)) errors.winbackStepDays = "Mốc sau phải lớn hơn mốc trước";
  if (!errors.winbackMaxInactiveDays && !errors.winbackStepDays && nums.winbackMaxInactiveDays[0]! <= wb[wb.length - 1]!)
    errors.winbackMaxInactiveDays = "Phải lớn hơn mốc thư cuối";
  const ex = nums.expiryStepDays;
  if (!errors.expiryStepDays && ex.some((n, i) => i > 0 && n >= ex[i - 1]!)) errors.expiryStepDays = "Thư 1 phải báo trước nhiều ngày hơn thư 2";
  const values = Object.fromEntries(FIELDS.map((f) => [f.key, f.parts ? nums[f.key] : nums[f.key][0]])) as unknown as MarketingParamValues;
  return { errors, values };
}

export function ParamsDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const params = useApi(() => marketingAdminApi.params(), []);
  return (
    <Modal wide onClose={onClose}>
      <ModalTitle icon={SlidersHorizontal}>Thông số gửi thư</ModalTitle>
      <div className="mt-5">
        <QueryBoundary query={params}>{(p) => <ParamsForm initial={p} onClose={onClose} onSaved={onSaved} />}</QueryBoundary>
      </div>
    </Modal>
  );
}

function ParamsForm({ initial, onClose, onSaved }: { initial: MarketingParams; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const { confirm, confirmDialog } = useConfirm();
  const [data, setData] = useState(initial);
  const [form, setForm] = useState(() => toForm(initial.values));
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const { errors, values } = validate(form, data.limits);
  const invalid = Object.keys(errors).length > 0;

  const setPart = (key: ParamKey, i: number, v: string) => {
    setTouched(true);
    setForm((f) => ({ ...f, [key]: f[key].map((s, j) => (j === i ? v : s)) }));
  };

  const save = async () => {
    setTouched(true);
    if (invalid) return;
    setBusy(true);
    setServerError(null);
    try {
      await marketingAdminApi.saveParams(values);
      toast.success("Đã lưu thông số");
      onSaved();
      onClose();
    } catch (err) {
      setServerError(errorMessage(err, "Chưa lưu được thông số"));
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    const ok = await confirm({ title: "Khôi phục mặc định?", message: "Mọi thông số sẽ trở về giá trị mặc định.", confirmLabel: "Khôi phục", tone: "danger", icon: RotateCcw });
    if (!ok) return;
    setBusy(true);
    setServerError(null);
    try {
      const r = await marketingAdminApi.resetParams();
      setData(r);
      setForm(toForm(r.values));
      setTouched(false);
      toast.success("Đã khôi phục mặc định");
      onSaved();
    } catch (err) {
      setServerError(errorMessage(err, "Chưa khôi phục được"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((f) => {
          const lim = data.limits[f.key];
          const def = ([] as number[]).concat(data.defaults[f.key]).join(", ");
          const hint = `${lim ? `Từ ${lim.min} đến ${lim.max}. ` : ""}Mặc định: ${def}`;
          const error = touched ? errors[f.key] : undefined;
          return (
            <fieldset key={f.key} className={f.parts ? "sm:col-span-2" : ""}>
              <legend className="md-label-large mb-1.5 text-on-surface-variant">{f.label}</legend>
              <div className="grid grid-cols-3 gap-2">
                {form[f.key].map((v, i) => (
                  <div key={i} className={f.parts ? "" : "col-span-3"}>
                    <Input
                      label={f.parts?.[i]}
                      aria-label={f.parts ? undefined : f.label}
                      type="number"
                      inputMode="numeric"
                      min={lim?.min}
                      max={lim?.max}
                      value={v}
                      onChange={(e) => setPart(f.key, i, e.target.value)}
                      aria-invalid={error ? true : undefined}
                    />
                  </div>
                ))}
              </div>
              <p role={error ? "alert" : undefined} className={`md-body-small mt-1 px-4 ${error ? "text-error" : "text-on-surface-variant"}`}>
                {error ?? hint}
              </p>
            </fieldset>
          );
        })}
      </div>
      {serverError && (
        <div className="mt-4">
          <FormError message={serverError} />
        </div>
      )}
      <ModalActions>
        <Button variant="text" className="mr-auto" disabled={busy} onClick={() => void reset()}>
          <RotateCcw size={16} />
          Khôi phục mặc định
        </Button>
        <Button variant="text" disabled={busy} onClick={onClose}>
          Huỷ
        </Button>
        <Button variant="primary" disabled={busy || (touched && invalid)} onClick={() => void save()}>
          {busy && <Loader2 size={16} className="animate-spin" />}
          Lưu
        </Button>
      </ModalActions>
      {confirmDialog}
    </>
  );
}
