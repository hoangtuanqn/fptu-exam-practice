import { useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, TriangleAlert } from "lucide-react";
import { authApi } from "@/features/auth/auth.api";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { buttonClass, Button } from "@/shared/ui/Button";
import { FormError } from "@/shared/ui/Feedback";
import { PasswordInput } from "@/shared/ui/Input";
import { AuthLayout } from "./AuthLayout";

export default function ResetPasswordPage() {
  const token = useSearchParams()[0].get("token") ?? "";
  const navigate = useNavigate();
  const toast = useToast();
  const { run, loading, error, fieldErrors, setFieldErrors } = useSubmit();
  const [form, setForm] = useState({ password: "", confirm: "" });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setFieldErrors({ confirm: "Mật khẩu nhập lại không khớp" });
    void run(async () => {
      await authApi.resetPassword({ token, password: form.password });
      toast.success("Đã đặt lại mật khẩu, hãy đăng nhập bằng mật khẩu mới");
      navigate("/login", { replace: true });
    });
  };

  // Mở thẳng trang không có token (không đi từ email)
  if (!token) {
    return (
      <AuthLayout title="Liên kết không hợp lệ" subtitle="Liên kết đặt lại mật khẩu bị thiếu hoặc không đầy đủ.">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <TriangleAlert size={18} className="mt-0.5 shrink-0" />
          Hãy mở đúng liên kết trong email, hoặc yêu cầu gửi lại một liên kết mới.
        </div>
        <Link to="/forgot-password" className={buttonClass({ variant: "primary", className: "mt-4 w-full" })}>
          Yêu cầu liên kết mới
        </Link>
      </AuthLayout>
    );
  }

  const mismatch = form.confirm.length > 0 && form.confirm !== form.password;

  return (
    <AuthLayout title="Đặt mật khẩu mới" subtitle="Chọn mật khẩu mới cho tài khoản của bạn.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={error} />
        <PasswordInput
          label="Mật khẩu mới"
          autoComplete="new-password"
          autoFocus
          value={form.password}
          onChange={set("password")}
          error={fieldErrors.password}
          hint="Tối thiểu 8 ký tự, gồm cả chữ và số"
        />
        <PasswordInput
          label="Nhập lại mật khẩu mới"
          autoComplete="new-password"
          value={form.confirm}
          onChange={set("confirm")}
          error={fieldErrors.confirm ?? (mismatch ? "Mật khẩu nhập lại không khớp" : undefined)}
        />
        <Button variant="primary" type="submit" disabled={loading || !form.password || !form.confirm} className="w-full !py-2.5">
          {loading && <Loader2 size={16} className="animate-spin" />}
          Đặt lại mật khẩu
        </Button>
      </form>

      {error && (
        <p className="mt-6 text-center text-sm text-slate-500">
          Liên kết hết hạn?{" "}
          <Link to="/forgot-password" className="font-medium text-brand-700 hover:underline">
            Yêu cầu liên kết mới
          </Link>
        </p>
      )}
    </AuthLayout>
  );
}
