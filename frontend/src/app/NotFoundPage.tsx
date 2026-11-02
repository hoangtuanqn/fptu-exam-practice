import { Link } from "react-router-dom";
import { buttonClass } from "@/shared/ui/Button";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="font-serif text-6xl font-semibold text-brand-900">404</div>
      <p className="text-slate-600">Trang bạn tìm không tồn tại.</p>
      <Link to="/" className={buttonClass({ variant: "primary" })}>
        Về trang chủ
      </Link>
    </div>
  );
}
