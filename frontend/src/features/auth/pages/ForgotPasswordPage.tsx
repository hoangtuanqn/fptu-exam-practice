import { useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { authApi } from "@/features/auth/auth.api";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Button } from "@/shared/ui/Button";
import { FormError } from "@/shared/ui/Feedback";
import { Input } from "@/shared/ui/Input";
import { AuthLayout } from "./AuthLayout";

const RESEND_SECONDS = 60; // khớp với thời gian chờ tối thiểu giữa hai lần gửi ở server

export default function ForgotPasswordPage() {
  const { run, loading, error, fieldErrors } = useSubmit();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  // Đếm ngược để chặn bấm gửi lại liên tục
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  const send = () =>
    run(async () => {
      await authApi.forgotPassword(email.trim());
      setSentTo(email.trim());
      setWait(RESEND_SECONDS);
    });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void send();
  };

  if (sentTo) {
    return (
      <AuthLayout title="Kiểm tra email của bạn" subtitle="Chúng mình đã gửi hướng dẫn đặt lại mật khẩu.">
        <div className="rounded-xl border border-brand-100 bg-brand-50/60 p-4 text-sm leading-relaxed text-slate-700">
          <MailCheck size={20} className="mb-2 text-brand-600" />
          Nếu <b className="text-slate-900">{sentTo}</b> đã đăng ký tài khoản, bạn sẽ nhận được email trong ít phút. Hãy
          mở thư và nhấn nút "Đặt lại mật khẩu". Liên kết có hiệu lực 30 phút và chỉ dùng được một lần.
          <p className="mt-2 text-xs text-slate-500">Không thấy thư? Kiểm tra cả mục Spam hoặc Quảng cáo.</p>
        </div>

        <FormError message={error} />

        <Button className="mt-4 w-full" disabled={loading || wait > 0} onClick={() => void send()}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          {wait > 0 ? `Gửi lại sau ${wait}s` : "Gửi lại email"}
        </Button>

        <p className="mt-6 text-center text-sm text-slate-500">
          <button onClick={() => setSentTo(null)} className="font-medium text-brand-700 hover:underline">
            Dùng email khác
          </button>
          {" · "}
          <Link to="/login" className="font-medium text-brand-700 hover:underline">
            Quay lại đăng nhập
          </Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Quên mật khẩu?" subtitle="Nhập email đã đăng ký, chúng mình sẽ gửi liên kết để bạn đặt lại mật khẩu.">
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
        <Button variant="primary" type="submit" disabled={loading || !email.trim()} className="w-full !py-2.5">
          {loading && <Loader2 size={16} className="animate-spin" />}
          Gửi liên kết đặt lại
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/login" className="inline-flex items-center gap-1.5 font-medium text-brand-700 hover:underline">
          <ArrowLeft size={14} /> Quay lại đăng nhập
        </Link>
      </p>
    </AuthLayout>
  );
}
