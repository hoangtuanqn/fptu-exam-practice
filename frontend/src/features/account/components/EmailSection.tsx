import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { userApi } from "@/features/account/api/user.api";
import { useAuth } from "@/features/auth/AuthContext";
import { VerifyEmailNotice } from "@/features/verify-email/VerifyEmailNotice";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { FormError } from "@/shared/ui/Feedback";
import { Input, PasswordInput } from "@/shared/ui/Input";

// Email đăng nhập: trạng thái xác minh và đổi email. Email chỉ đổi sau khi bấm liên kết trong thư gửi tới địa chỉ mới.
export function EmailSection() {
  const { user } = useAuth();
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (!user) return null;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await userApi.changeEmail({ email, password });
      setSentTo(email.trim().toLowerCase());
      setEmail("");
      setPassword("");
      toast.success("Đã gửi thư xác minh tới email mới");
    });
  };

  return (
    <Card>
      <CardHeader title="Email đăng nhập" />
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-slate-900">{user.email}</span>
          {user.emailVerifiedAt ? <Badge tone="success">Đã xác minh</Badge> : <Badge tone="warning">Chưa xác minh</Badge>}
        </div>
        <VerifyEmailNotice variant="inline" />

        <form onSubmit={onSubmit} className="space-y-4 border-t border-slate-100 pt-4" noValidate>
          <div className="text-sm font-medium text-slate-800">Đổi email</div>
          <FormError message={error} />
          <Input
            label="Email mới"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            placeholder="ban@example.com"
          />
          <PasswordInput
            label="Mật khẩu hiện tại"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            hint="Để xác nhận đây là bạn. Email chỉ đổi sau khi bạn bấm liên kết trong thư gửi tới địa chỉ mới."
          />
          {sentTo && <p className="rounded-lg bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">Đã gửi thư xác minh tới <b>{sentTo}</b>. Bấm liên kết trong thư để hoàn tất. Trong lúc chờ, bạn vẫn đăng nhập bằng email cũ.</p>}
          <Button variant="primary" type="submit" disabled={loading || !email.trim() || !password}>
            {loading && <Loader2 size={16} className="animate-spin" />}
            Gửi thư xác minh
          </Button>
        </form>
      </div>
    </Card>
  );
}
