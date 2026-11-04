import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useSubmit } from "@/shared/hooks/useSubmit";
import type { AccountSettings } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { ErrorBox, FormError, Loading } from "@/shared/ui/Feedback";
import { Input } from "@/shared/ui/Input";

function SignupForm({ initial, onSaved }: { initial: AccountSettings; onSaved: () => void }) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [signupCredit, setSignupCredit] = useState(String(initial.signupCredit));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await adminApi.saveAccountSettings({ signupCredit: Number(signupCredit) });
      toast.success("Đã lưu cấu hình tài khoản");
      onSaved();
    });
  };

  return (
    <Card>
      <CardHeader title="Tặng credit khi đăng ký" description="Mọi tài khoản mới (đăng ký bằng email hoặc Google) được cộng sẵn số credit này." />
      <form onSubmit={onSubmit} className="max-w-md space-y-5 p-5" noValidate>
        <FormError message={error} />
        <Input
          label="Credit tặng mỗi tài khoản mới"
          inputMode="numeric"
          value={signupCredit}
          onChange={(e) => setSignupCredit(e.target.value.replace(/\D/g, "").slice(0, 7))}
          error={fieldErrors.signupCredit}
          hint="0 = không tặng. Chỉ áp dụng cho tài khoản đăng ký từ nay về sau. Nếu đăng ký qua mã giới thiệu, thưởng giới thiệu được cộng thêm."
        />
        <Button variant="primary" type="submit" disabled={loading || signupCredit === ""}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Lưu cấu hình
        </Button>
      </form>
    </Card>
  );
}

// Cấu hình chung của tài khoản (hiện có: credit tặng khi đăng ký)
export default function AccountSettingsPage() {
  const settings = useApi(() => adminApi.accountSettings(), []);
  return (
    <>
      <PageHeader title="Cấu hình đăng ký" description="Thiết lập mặc định cho tài khoản mới." />
      {settings.data ? (
        <SignupForm key={JSON.stringify(settings.data)} initial={settings.data} onSaved={settings.reload} />
      ) : settings.loading ? (
        <Loading />
      ) : (
        <ErrorBox message={settings.error ?? "Không tải được cấu hình"} onRetry={settings.reload} />
      )}
    </>
  );
}
