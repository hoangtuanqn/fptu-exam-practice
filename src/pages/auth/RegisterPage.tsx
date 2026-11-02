import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { authApi } from "../../api/auth.api";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/Feedback";
import { Input, PasswordInput } from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useSubmit } from "../../hooks/useSubmit";
import { AuthLayout } from "./AuthLayout";

export default function RegisterPage() {
  const { signIn } = useAuth();
  const toast = useToast();
  const { run, loading, error, fieldErrors, setFieldErrors } = useSubmit();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirm: "" });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const mismatch = form.confirm.length > 0 && form.confirm !== form.password;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) return setFieldErrors({ confirm: "Mật khẩu nhập lại không khớp" });
    void run(async () => {
      const { fullName, email, password } = form;
      signIn(await authApi.register({ fullName, email, password }));
      toast.success("Đăng ký thành công");
    });
  };

  return (
    <AuthLayout title="Tạo tài khoản" subtitle="Chỉ mất vài giây. Dùng email để đăng nhập sau này.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={error} />
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
