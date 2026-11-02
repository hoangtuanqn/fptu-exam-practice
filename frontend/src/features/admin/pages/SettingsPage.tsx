import { useState, type FormEvent } from "react";
import { CheckCircle2, Loader2, Play, XCircle } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { ErrorBox, FormError, Loading } from "@/shared/ui/Feedback";
import { Input, PasswordInput } from "@/shared/ui/Input";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useSubmit } from "@/shared/hooks/useSubmit";
import type { SepayAdminConfig } from "@/shared/types/api";
import { formatDateTime } from "@/shared/utils/formatters";

const CRON_PRESETS = [
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

function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? "bg-brand-900" : "bg-slate-300"}`}
    >
      <span className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : ""}`} />
    </button>
  );
}

function SyncCard() {
  const toast = useToast();
  const status = useApi(() => adminApi.sepayStatus(), []);
  const { run, loading } = useSubmit();

  const syncNow = () =>
    void run(async () => {
      const r = await adminApi.syncNow();
      r.ok ? toast.success(`Đối soát xong: ${r.created} giao dịch mới, ${r.matched} khớp lệnh`) : toast.error(r.message);
      status.reload();
    });

  const last = status.data;
  return (
    <Card>
      <CardHeader
        title="Đối soát tự động"
        description="Cron lấy giao dịch từ SePay và cộng tiền cho lệnh khớp mã nạp."
        action={
          <Button onClick={syncNow} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            Chạy ngay
          </Button>
        }
      />
      <div className="p-5 text-sm">
        {status.loading && !status.data ? (
          <span className="text-slate-500">Đang tải…</span>
        ) : last ? (
          <div className="flex items-start gap-3">
            {last.ok ? <CheckCircle2 size={18} className="mt-0.5 text-emerald-600" /> : <XCircle size={18} className="mt-0.5 text-rose-600" />}
            <div>
              <div className="font-medium text-slate-800">{last.ok ? "Lần chạy gần nhất thành công" : "Lần chạy gần nhất lỗi"}</div>
              <div className="text-slate-500">{formatDateTime(last.at)} · {last.message}</div>
              {last.ok && <div className="text-slate-500">Lấy {last.fetched} · mới {last.created} · khớp lệnh {last.matched}</div>}
            </div>
          </div>
        ) : (
          <span className="text-slate-500">Chưa có lần chạy nào.</span>
        )}
      </div>
    </Card>
  );
}

function ConfigForm({ initial, onSaved }: { initial: SepayAdminConfig; onSaved: () => void }) {
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
            <Input label="Lịch chạy (cron 5 trường)" className="font-mono" value={form.cronExpression} onChange={text("cronExpression")} error={fieldErrors.cronExpression} />
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

export default function SettingsPage() {
  const config = useApi(() => adminApi.sepayConfig(), []);
  const [syncKey, setSyncKey] = useState(0); // đổi key để SyncCard tải lại trạng thái

  return (
    <>
      <PageHeader title="Cấu hình SePay" description="Thiết lập nhận tiền và lịch đối soát tự động." />
      {config.loading && !config.data ? (
        <Loading />
      ) : config.error || !config.data ? (
        <ErrorBox message={config.error ?? "Không tải được cấu hình"} onRetry={config.reload} />
      ) : (
        <div className="space-y-6">
          <ConfigForm
            key={config.data.apiTokenPreview}
            initial={config.data}
            onSaved={() => {
              config.reload();
              setSyncKey((k) => k + 1);
            }}
          />
          <SyncCard key={syncKey} />
        </div>
      )}
    </>
  );
}
