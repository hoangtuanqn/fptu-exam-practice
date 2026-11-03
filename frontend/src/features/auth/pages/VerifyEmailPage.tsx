import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CircleCheck, CircleX, Loader2 } from "lucide-react";
import { authApi } from "@/features/auth/auth.api";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import { buttonClass } from "@/shared/ui/Button";
import { AuthLayout } from "./AuthLayout";

type State = { phase: "loading" } | { phase: "ok"; email: string } | { phase: "error"; message: string };

// Trang mở từ liên kết trong email: xác minh (hoặc đổi) email. Không cần đăng nhập, mở trên thiết bị nào cũng được.
export default function VerifyEmailPage() {
  const token = useSearchParams()[0].get("token");
  const { user, refresh } = useAuth();
  const [state, setState] = useState<State>(token ? { phase: "loading" } : { phase: "error", message: "Liên kết xác minh không hợp lệ" });
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return; // StrictMode chạy effect hai lần; token chỉ dùng được một lần
    started.current = true;
    authApi
      .verifyEmail(token)
      .then(async (r) => {
        setState({ phase: "ok", email: r.email });
        if (localStorage.getItem("auth_token")) await refresh(); // đang đăng nhập thì cập nhật trạng thái ngay
      })
      .catch((err: unknown) => setState({ phase: "error", message: err instanceof ApiError ? err.message : "Không xác minh được email" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthLayout title="Xác minh email" subtitle="">
      <div className="space-y-5 py-4 text-center">
        {state.phase === "loading" && (
          <>
            <Loader2 size={32} className="mx-auto animate-spin text-brand-600" />
            <p className="text-sm text-slate-600">Đang xác minh…</p>
          </>
        )}
        {state.phase === "ok" && (
          <>
            <CircleCheck size={40} className="mx-auto text-emerald-600" />
            <p className="text-base font-medium text-slate-900">Đã xác minh email</p>
            <p className="text-sm text-slate-600">{state.email} đã sẵn sàng. Bạn có thể sử dụng đầy đủ các dịch vụ.</p>
            <Link to={user ? "/" : "/login"} className={buttonClass({ variant: "primary", grow: true })}>
              {user ? "Về trang chủ" : "Đăng nhập"}
            </Link>
          </>
        )}
        {state.phase === "error" && (
          <>
            <CircleX size={40} className="mx-auto text-rose-500" />
            <p className="text-base font-medium text-slate-900">Không xác minh được</p>
            <p className="text-sm text-slate-600">{state.message}</p>
            <p className="text-xs text-slate-500">Đăng nhập rồi gửi lại thư xác minh ở trang Hồ sơ hoặc ngay trên thanh nhắc.</p>
            <Link to="/login" className={buttonClass({ variant: "primary", grow: true })}>
              Đăng nhập
            </Link>
          </>
        )}
      </div>
    </AuthLayout>
  );
}
