import { Loader2 } from "lucide-react";
import { authApi } from "@/features/auth/auth.api";
import { useAuth } from "@/features/auth/AuthContext";
import { referralCodeStore } from "@/features/referral/referral.api";
import { ApiError } from "@/shared/api/client";
import { GoogleIcon } from "@/shared/brand/GoogleIcon";
import { useToast } from "@/shared/context/ToastContext";
import { useGoogleLogin } from "./useGoogleLogin";

// Nút "Tiếp tục với Google" + đường kẻ "hoặc". Chỉ hiện khi backend đã cấu hình GOOGLE_CLIENT_ID và thư viện Google tải được.
// Email do Google xác minh nên tài khoản vào là dùng được ngay, không cần xác minh email.
export function GoogleButton({ label = "Tiếp tục với Google" }: { label?: string }) {
  const { signIn } = useAuth();
  const toast = useToast();

  const { available, busy, start } = useGoogleLogin(
    async (accessToken) => {
      try {
        const result = await authApi.google({ accessToken, referralCode: referralCodeStore.get() ?? undefined });
        referralCodeStore.clear();
        signIn(result); // GuestOnly tự chuyển sang trang phù hợp
      } catch (err) {
        toast.error(err instanceof ApiError ? err.message : "Không đăng nhập được bằng Google");
      }
    },
    (message) => toast.error(message),
  );

  if (!available) return null;

  return (
    <>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 shadow-soft transition hover:bg-slate-50 disabled:opacity-60"
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
        {label}
      </button>
      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400" aria-hidden>
        <span className="h-px flex-1 bg-slate-200" />
        hoặc
        <span className="h-px flex-1 bg-slate-200" />
      </div>
    </>
  );
}
