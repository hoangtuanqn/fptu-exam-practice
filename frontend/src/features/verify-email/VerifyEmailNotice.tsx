import { useEffect, useState } from "react";
import { Loader2, MailWarning } from "lucide-react";
import { authApi } from "@/features/auth/auth.api";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";

const COOLDOWN_SEC = 60; // khớp backend/constants/email-verification.ts

interface Props {
  variant?: "banner" | "inline";
  message?: string;
}

// Nhắc xác minh email kèm nút gửi lại thư (có thời gian chờ giữa hai lần). Chỉ hiện khi tài khoản chưa xác minh.
export function VerifyEmailNotice({ variant = "banner", message }: Props) {
  const { user } = useAuth();
  const toast = useToast();
  const [sending, setSending] = useState(false);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  if (!user || user.emailVerifiedAt) return null;

  const resend = async () => {
    setSending(true);
    try {
      await authApi.resendVerification();
      toast.success("Đã gửi lại thư xác minh, hãy kiểm tra hộp thư (cả mục Spam)");
      setWait(COOLDOWN_SEC);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Không gửi được thư xác minh");
      if (err instanceof ApiError && err.status === 429) setWait(COOLDOWN_SEC);
    } finally {
      setSending(false);
    }
  };

  const body = (
    <>
      <div className="min-w-0 flex-1 text-sm">
        <span className="font-medium">Xác minh email để sử dụng dịch vụ.</span>{" "}
        <span className="text-amber-800/80">{message ?? <>Chúng mình đã gửi thư tới <b>{user.email}</b>. Bạn vẫn nạp credit và nhận credit bình thường.</>}</span>
      </div>
      <Button size="sm" onClick={() => void resend()} disabled={sending || wait > 0}>
        {sending && <Loader2 size={14} className="animate-spin" />}
        {wait > 0 ? `Gửi lại sau ${wait}s` : "Gửi lại thư"}
      </Button>
    </>
  );

  return variant === "banner" ? (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-amber-900 sm:px-6 lg:px-8">
      <MailWarning size={16} className="shrink-0 text-amber-600" />
      {body}
    </div>
  ) : (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-amber-900">
      <MailWarning size={16} className="shrink-0 text-amber-600" />
      {body}
    </div>
  );
}
