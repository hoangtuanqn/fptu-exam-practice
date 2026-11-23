import { useState } from "react";
import { Loader2 } from "lucide-react";
import { authApi } from "@/features/auth/auth.api";
import { useAuth } from "@/features/auth/AuthContext";
import { useGithubLogin } from "@/features/auth/github/useGithubLogin";
import { useGoogleLogin } from "@/features/auth/google/useGoogleLogin";
import { referralCodeStore } from "@/features/referral/referral.api";
import { GithubIcon } from "@/shared/brand/GithubIcon";
import { GoogleIcon } from "@/shared/brand/GoogleIcon";
import { FormError } from "@/shared/ui/Feedback";
import type { AuthResult } from "@/features/auth/auth.api";
import { errorMessage } from "@/shared/api/errors";

const buttonCls =
  "flex w-full items-center justify-center gap-2.5 rounded-lg border border-slate-300 bg-surface-container-lowest px-3 py-2.5 text-sm sm:px-4 font-medium text-slate-800 shadow-soft transition hover:bg-slate-50 disabled:opacity-60";

// Các nút "Tiếp tục với Google / GitHub" + đường kẻ "hoặc". Nút nào chưa cấu hình (hoặc không tải được) thì ẩn; không có nút nào thì ẩn cả khối.
// Email do nhà cung cấp xác minh nên tài khoản vào là dùng được ngay, không cần xác minh email.
export function SocialLogin({ verb = "Tiếp tục" }: { verb?: string }) {
  const { signIn } = useAuth();
  // Lỗi hiện ngay dưới nút (không dùng toast tự tắt) để người dùng kịp đọc nguyên nhân
  const [error, setError] = useState<string | null>(null);

  const finish = async (login: () => Promise<AuthResult>, fallback: string) => {
    setError(null);
    try {
      const result = await login();
      referralCodeStore.clear();
      signIn(result); // GuestOnly tự chuyển sang trang phù hợp
    } catch (err) {
      setError(errorMessage(err, fallback));
    }
  };

  const google = useGoogleLogin(
    (accessToken) => finish(() => authApi.google({ accessToken, referralCode: referralCodeStore.get() ?? undefined }), "Không đăng nhập được bằng Google"),
    setError,
  );
  const github = useGithubLogin(
    (code) => finish(() => authApi.github({ code, referralCode: referralCodeStore.get() ?? undefined }), "Không đăng nhập được bằng GitHub"),
    setError,
  );

  if (!google.available && !github.available) return null;

  return (
    <>
      <div className={`grid gap-2.5 ${google.available && github.available ? "grid-cols-2 sm:grid-cols-1" : "grid-cols-1"}`}>
        {google.available && (
          <button type="button" onClick={() => { setError(null); google.start(); }} disabled={google.busy} aria-label={`${verb} với Google`} className={buttonCls}>
            {google.busy ? <Loader2 size={18} className="animate-spin" /> : <GoogleIcon />}
            <span className="sm:hidden">Google</span>
            <span className="hidden sm:inline">{verb} với Google</span>
          </button>
        )}
        {github.available && (
          <button type="button" onClick={() => { setError(null); github.start(); }} disabled={github.busy} aria-label={`${verb} với GitHub`} className={buttonCls}>
            {github.busy ? <Loader2 size={18} className="animate-spin" /> : <GithubIcon />}
            <span className="sm:hidden">GitHub</span>
            <span className="hidden sm:inline">{verb} với GitHub</span>
          </button>
        )}
      </div>
      {error && (
        <div className="mt-3">
          <FormError message={error} />
        </div>
      )}
      <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-slate-500" aria-hidden>
        <span className="h-px flex-1 bg-slate-200" />
        hoặc
        <span className="h-px flex-1 bg-slate-200" />
      </div>
    </>
  );
}
