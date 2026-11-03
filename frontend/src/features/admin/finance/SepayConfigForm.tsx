import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import type { SepayAdminConfig } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { FormError } from "@/shared/ui/Feedback";
import { Input, PasswordInput } from "@/shared/ui/Input";
import { Switch } from "@/shared/ui/Switch";

const CRON_PRESETS = [
  { label: "Mỗi 10 giây", value: "*/10 * * * * *" },
  { label: "Mỗi 30 giây", value: "*/30 * * * * *" },
  { label: "Mỗi phút", value: "* * * * *" },
  { label: "Mỗi 2 phút", value: "*/2 * * * *" },
  { label: "Mỗi 5 phút", value: "*/5 * * * *" },
];

interface FormState {
  apiToken: string;
  accountNumber: string;
  accountName: string;
  bankCode: string;
  codePrefix: string;
  minDeposit: string;
  orderExpireMinutes: string;
  cronEnabled: boolean;
  cronExpression: string;
}

// Form cấu hình SePay: tài khoản nhận tiền, tiền tố mã nạp, lịch cron
export function SepayConfigForm({ initial, onSaved }: { initial: SepayAdminConfig; onSaved: () => void }) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [form, setForm] = useState<FormState>({
    apiToken: "",
    accountNumber: initial.accountNumber,
    accountName: initial.accountName,
    bankCode: initial.bankCode,
    codePrefix: initial.codePrefix,
    minDeposit: String(initial.minDeposit),
    orderExpireMinutes: String(initial.orderExpireMinutes),
    cronEnabled: initial.cronEnabled,
    cronExpression: initial.cronExpression,
  });
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));
  const text = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => set(key, e.target.value as never);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await adminApi.saveSepayConfig({
        ...form,
        apiToken: form.apiToken || undefined, // để trống = giữ token cũ
        minDeposit: Number(form.minDeposit),
        orderExpireMinutes: Number(form.orderExpireMinutes),
      });
      set("apiToken", "");
      toast.success("Đã lưu cấu hình SePay");
      onSaved();
    });
  };

  return (
    <Card>
      <CardHeader title="Cấu hình SePay" description="Thông tin tài khoản nhận tiền và lịch đối soát." />
      <form onSubmit={onSubmit} className="space-y-5 p-5" noValidate>
        <FormError message={error} />

        <PasswordInput
          label="API token"
          autoComplete="off"
          value={form.apiToken}
          onChange={text("apiToken")}
          error={fieldErrors.apiToken}
          placeholder={initial.hasApiToken ? `Đang dùng ${initial.apiTokenPreview} (để trống nếu không đổi)` : "Dán API key từ SePay"}
          hint="SePay → Cấu hình công ty → API Access"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Số tài khoản" inputMode="numeric" value={form.accountNumber} onChange={text("accountNumber")} error={fieldErrors.accountNumber} />
          <Input label="Tên chủ tài khoản" value={form.accountName} onChange={text("accountName")} error={fieldErrors.accountName} />
          <Input label="Ngân hàng (mã SePay)" value={form.bankCode} onChange={text("bankCode")} error={fieldErrors.bankCode} placeholder="MBBank, Vietcombank…" />
          <Input label="Tiền tố mã nạp" value={form.codePrefix} onChange={text("codePrefix")} error={fieldErrors.codePrefix} hint="2–10 chữ cái, ví dụ NAP" />
          <Input label="Nạp tối thiểu (₫)" inputMode="numeric" value={form.minDeposit} onChange={text("minDeposit")} error={fieldErrors.minDeposit} />
          <Input label="Lệnh hết hạn sau (phút)" inputMode="numeric" value={form.orderExpireMinutes} onChange={text("orderExpireMinutes")} error={fieldErrors.orderExpireMinutes} />
        </div>

        <div className="rounded-lg border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-medium text-slate-800">Bật cron đối soát</div>
              <div className="text-xs text-slate-500">Tắt thì tiền chỉ được cộng khi bạn bấm “Chạy ngay”.</div>
            </div>
            <Switch checked={form.cronEnabled} onChange={(v) => set("cronEnabled", v)} label="Bật cron đối soát" />
          </div>
          <div className={`mt-4 space-y-2 ${form.cronEnabled ? "" : "pointer-events-none opacity-50"}`}>
            <Input
              label="Lịch chạy (cron)"
              value={form.cronExpression}
              onChange={text("cronExpression")}
              error={fieldErrors.cronExpression}
              hint="5 trường: phút giờ ngày tháng thứ (tối thiểu mỗi phút). Thêm trường GIÂY ở đầu (6 trường) để chạy dưới 1 phút, ví dụ */10 * * * * * = mỗi 10 giây (bước giây tối thiểu 10)."
            />
            <div className="flex flex-wrap gap-2">
              {CRON_PRESETS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => set("cronExpression", p.value)}
                  className={`rounded-lg border px-3 py-1 text-xs transition ${
                    form.cronExpression === p.value ? "border-brand-700 bg-brand-50 text-brand-900" : "border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Button variant="primary" type="submit" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Lưu cấu hình
        </Button>
      </form>
    </Card>
  );
}
