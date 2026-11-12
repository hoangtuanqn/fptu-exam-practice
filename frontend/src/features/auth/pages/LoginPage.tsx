import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { authApi } from "@/features/auth/auth.api";
import { Button } from "@/shared/ui/Button";
import { FormError } from "@/shared/ui/Feedback";
import { Input, PasswordInput } from "@/shared/ui/Input";
import { useAuth } from "@/features/auth/AuthContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { CaptchaDialog } from "@/shared/ui/CaptchaDialog";
import { TURNSTILE_SITE_KEY } from "@/shared/ui/Turnstile";
import { SocialLogin } from "@/features/auth/social/SocialLogin";
import { AuthLayout } from "./AuthLayout";

export default function LoginPage() {
  const { signIn } = useAuth();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Máy chủ đòi captcha sau vài lần đăng nhập sai (lỗi có trường "captcha", nội dung vẫn là "sai email/mật khẩu"):
  // từ đó mỗi lần đăng nhập hiện hộp thoại captcha, qua rồi tự đóng và đăng nhập luôn (token chỉ dùng được một lần)
  const [needCaptcha, setNeedCaptcha] = useState(false);
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    if (fieldErrors.captcha) setNeedCaptcha(true);
  }, [fieldErrors.captcha]);

  // Đăng nhập xong, GuestOnly tự chuyển sang trang phù hợp
  const login = (captchaToken?: string) => void run(async () => signIn(await authApi.login({ email, password, captchaToken })));
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (needCaptcha && TURNSTILE_SITE_KEY) setAsking(true);
    else login();
  };

  return (
    <AuthLayout title="Đăng nhập" subtitle="Chào mừng quay lại. Nhập thông tin để tiếp tục.">
      <SocialLogin />
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <FormError message={error ?? fieldErrors.captcha ?? null} />
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
        <div>
          <PasswordInput
            label="Mật khẩu"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
          />
          <div className="mt-1.5 text-right">
            <Link to="/forgot-password" className="text-xs font-medium text-brand-700 hover:underline">
              Quên mật khẩu?
            </Link>
          </div>
        </div>
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
      {asking && (
        <CaptchaDialog
          onClose={() => setAsking(false)}
          onVerified={(t) => {
            setAsking(false);
            login(t);
          }}
        />
      )}
    </AuthLayout>
  );
}
