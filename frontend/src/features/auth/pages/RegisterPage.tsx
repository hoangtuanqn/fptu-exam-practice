import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Gift, Loader2 } from "lucide-react";
import { referralApi, referralCodeStore } from "@/features/referral/referral.api";
import { formatCredit } from "@/shared/utils/formatters";
import { authApi } from "@/features/auth/auth.api";
import { Button } from "@/shared/ui/Button";
import { FormError } from "@/shared/ui/Feedback";
import { Input, PasswordInput } from "@/shared/ui/Input";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { AuthLayout } from "./AuthLayout";

export default function RegisterPage() {
  const { signIn } = useAuth();
  const toast = useToast();
  const { run, loading, error, fieldErrors, setFieldErrors } = useSubmit();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  // Mã giới thiệu từ ?ref=...: nhớ lại (đi vòng qua trang khác rồi đăng ký vẫn được tính) và hiện lời mời nếu mã hợp lệ
  const [params] = useSearchParams();
  const [invite, setInvite] = useState<{ bonus: number } | null>(null);
  const refParam = params.get("ref")?.trim().toUpperCase();
  useEffect(() => {
    if (refParam && /^[A-Z0-9]{4,12}$/.test(refParam)) referralCodeStore.set(refParam);
    const code = referralCodeStore.get();
    if (!code) return;
    let cancelled = false;
    referralApi
      .publicInfo(code)
      .then((r) => !cancelled && r.valid && setInvite({ bonus: r.bonus }))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [refParam]);

  const mismatch = form.confirm.length > 0 && form.confirm !== form.password;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setFieldErrors({ confirm: "Mật khẩu nhập lại không khớp" });
    void run(async () => {
      const { fullName, email, password } = form;
      signIn(await authApi.register({ fullName, email, password, referralCode: referralCodeStore.get() ?? undefined }));
      referralCodeStore.clear();
      toast.success("Đăng ký thành công. Hãy kiểm tra email để xác minh tài khoản.");
    });
  };

  return (
    <AuthLayout title="Tạo tài khoản" subtitle="Chỉ mất vài giây. Dùng email để đăng nhập sau này.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={error} />
        {invite && invite.bonus > 0 && (
          <div role="status" className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-sm text-emerald-900">
            <Gift size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            <span>
              Bạn được bạn bè giới thiệu. Đăng ký xong nhận ngay <b>{formatCredit(invite.bonus)}</b>.
            </span>
          </div>
        )}
        <Input
          label="Họ và tên"
          autoComplete="name"
          autoFocus
          value={form.fullName}
          onChange={set("fullName")}
          error={fieldErrors.fullName}
        />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          value={form.email}
          onChange={set("email")}
          error={fieldErrors.email}
          placeholder="ban@example.com"
        />
        <PasswordInput
          label="Mật khẩu"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          error={fieldErrors.password}
          hint="Tối thiểu 8 ký tự, gồm chữ và số"
        />
        <PasswordInput
          label="Nhập lại mật khẩu"
          autoComplete="new-password"
          value={form.confirm}
          onChange={set("confirm")}
          error={fieldErrors.confirm ?? (mismatch ? "Mật khẩu nhập lại không khớp" : undefined)}
        />
        <Button
          variant="primary"
          type="submit"
          disabled={loading || !form.fullName || !form.email || !form.password || !form.confirm}
          className="w-full !py-2.5"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          Đăng ký
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Đã có tài khoản?{" "}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Đăng nhập
        </Link>
      </p>
    </AuthLayout>
  );
}
