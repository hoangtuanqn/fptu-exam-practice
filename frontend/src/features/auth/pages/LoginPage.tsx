import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { authApi } from "@/features/auth/auth.api";
import { Button } from "@/shared/ui/Button";
import { FormError } from "@/shared/ui/Feedback";
import { Input, PasswordInput } from "@/shared/ui/Input";
import { useAuth } from "@/features/auth/AuthContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Turnstile, TURNSTILE_SITE_KEY } from "@/shared/ui/Turnstile";
import { SocialLogin } from "@/features/auth/social/SocialLogin";
import { AuthLayout } from "./AuthLayout";

export default function LoginPage() {
  const { signIn } = useAuth();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Máy chủ đòi captcha sau vài lần đăng nhập sai (lỗi có trường "captcha"); token chỉ dùng một lần nên làm mới widget sau mỗi lần gửi
  const [needCaptcha, setNeedCaptcha] = useState(false);
  const [captcha, setCaptcha] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey] = useState(0);
  useEffect(() => {
    if (fieldErrors.captcha) setNeedCaptcha(true);
  }, [fieldErrors.captcha]);
  const captchaOn = needCaptcha && !!TURNSTILE_SITE_KEY;

  // Đăng nhập xong, GuestOnly tự chuyển sang trang phù hợp
  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const token = captcha ?? undefined;
      setCaptcha(null);
      setCaptchaKey((k) => k + 1);
      return signIn(await authApi.login({ email, password, captchaToken: token }));
    });
  };

  return (
    <AuthLayout title="Đăng nhập" subtitle="Chào mừng quay lại. Nhập thông tin để tiếp tục.">
      <SocialLogin />
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
        {captchaOn && (
          <div className="space-y-2">
            {fieldErrors.captcha && <p className="text-sm text-red-600">{fieldErrors.captcha}</p>}
            <Turnstile key={captchaKey} onToken={setCaptcha} />
          </div>
        )}
        <Button variant="primary" type="submit" disabled={loading || !email || !password || (captchaOn && !captcha)} className="w-full !py-2.5">
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
