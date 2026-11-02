import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { authApi } from "../../api/auth.api";
import { Button } from "../../components/ui/Button";
import { FormError } from "../../components/ui/Feedback";
import { Input, PasswordInput } from "../../components/ui/Input";
import { useAuth } from "../../context/AuthContext";
import { useSubmit } from "../../hooks/useSubmit";
import { AuthLayout } from "./AuthLayout";

export default function LoginPage() {
  const { signIn } = useAuth();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Đăng nhập xong, GuestOnly tự chuyển sang trang phù hợp
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => signIn(await authApi.login({ email, password })));
  };

  return (
    <AuthLayout title="Đăng nhập" subtitle="Chào mừng quay lại. Nhập thông tin để tiếp tục.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={error} />
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          placeholder="ban@example.com"
        />
        <PasswordInput
          label="Mật khẩu"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
        />
        <Button variant="primary" type="submit" disabled={loading || !email || !password} className="w-full !py-2.5">
          {loading && <Loader2 size={16} className="animate-spin" />}
          Đăng nhập
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Chưa có tài khoản?{" "}
        <Link to="/register" className="font-medium text-brand-700 hover:underline">
          Đăng ký
        </Link>
      </p>
    </AuthLayout>
  );
}
