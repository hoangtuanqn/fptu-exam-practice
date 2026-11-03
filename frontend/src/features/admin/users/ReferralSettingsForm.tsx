import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import type { ReferralSettings } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { FormError } from "@/shared/ui/Feedback";
import { Input } from "@/shared/ui/Input";
import { Switch } from "@/shared/ui/Switch";

const digits = (v: string) => v.replace(/\D/g, "");

// Cấu hình chương trình giới thiệu: thưởng đăng ký, thưởng cho người giới thiệu, % hoa hồng khi nạp tiền
export function ReferralSettingsForm({ initial, onSaved }: { initial: ReferralSettings; onSaved: () => void }) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [enabled, setEnabled] = useState(initial.enabled);
  const [signupBonus, setSignupBonus] = useState(String(initial.signupBonus));
  const [referrerSignupBonus, setReferrerSignupBonus] = useState(String(initial.referrerSignupBonus));
  const [commissionPercent, setCommissionPercent] = useState(String(initial.commissionPercent));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await adminApi.saveReferralSettings({
        enabled,
        signupBonus: Number(signupBonus),
        referrerSignupBonus: Number(referrerSignupBonus),
        commissionPercent: Number(commissionPercent),
      });
      toast.success("Đã lưu cấu hình giới thiệu");
      onSaved();
    });
  };

  return (
    <Card>
      <CardHeader title="Cấu hình giới thiệu" description="Áp dụng cho các đăng ký và lần nạp tiền từ nay về sau." />
      <form onSubmit={onSubmit} className="space-y-5 p-5" noValidate>
        <FormError message={error} />

        <div className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4">
          <div>
            <div className="text-sm font-medium text-slate-800">Bật chương trình giới thiệu</div>
            <div className="text-xs text-slate-500">Tắt thì không ai nhận thưởng hay hoa hồng mới. Liên kết giới thiệu vẫn hoạt động.</div>
          </div>
          <Switch checked={enabled} onChange={setEnabled} label="Bật chương trình giới thiệu" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Thưởng người mới (credit)"
            inputMode="numeric"
            value={signupBonus}
            onChange={(e) => setSignupBonus(digits(e.target.value))}
            error={fieldErrors.signupBonus}
            hint="Người đăng ký qua mã giới thiệu nhận."
          />
          <Input
            label="Thưởng người giới thiệu (credit)"
            inputMode="numeric"
            value={referrerSignupBonus}
            onChange={(e) => setReferrerSignupBonus(digits(e.target.value))}
            error={fieldErrors.referrerSignupBonus}
            hint="Nhận khi có người đăng ký. 0 = không tặng."
          />
          <Input
            label="Hoa hồng nạp tiền (%)"
            inputMode="numeric"
            value={commissionPercent}
            onChange={(e) => setCommissionPercent(digits(e.target.value))}
            error={fieldErrors.commissionPercent}
            hint="Người giới thiệu nhận % mỗi lần người kia nạp."
          />
        </div>

        <Button variant="primary" type="submit" disabled={loading}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Lưu cấu hình
        </Button>
      </form>
    </Card>
  );
}
