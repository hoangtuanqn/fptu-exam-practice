import { Link, Navigate, useParams } from "react-router-dom";
import { PublicDepositView } from "@/features/account/components/PublicDepositView";
import { useAuth } from "@/features/auth/AuthContext";
import { brand } from "@/shared/brand/brand";
import { Logo } from "@/shared/brand/Logo";
import { Footer } from "@/shared/layout/Footer";
import { Loading } from "@/shared/ui/Feedback";

// /deposit/:code: ai có liên kết cũng mở được, không cần đăng nhập.
// Đã đăng nhập thì chuyển sang trang bình thường trong tài khoản (nếu không phải chủ lệnh, trang đó tự hiện bản rút gọn).
export default function PublicDepositPage() {
  const { code = "" } = useParams();
  const { user, loading } = useAuth();

  if (loading) return <Loading />;
  if (user) return <Navigate to={`/account/deposit/${encodeURIComponent(code)}`} replace />;

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-surface-container-lowest px-4">
        <Link to="/" title={brand.company}>
          <Logo variant="full" className="h-9" />
        </Link>
        <Link to="/login" className="text-sm font-medium text-brand-700 hover:underline">
          Đăng nhập
        </Link>
      </header>
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        <PublicDepositView code={code} />
      </main>
      <Footer />
    </div>
  );
}
