import { Link } from "react-router-dom";
import { ArrowRight, BookOpenCheck, Plus } from "lucide-react";
import { userApi } from "@/features/account/api/user.api";
import { buttonClass } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";
import { TransactionTable } from "@/features/account/components/TransactionTable";
import { useAuth } from "@/features/auth/AuthContext";
import { useApi } from "@/shared/hooks/useApi";
import { formatDate, formatMoney } from "@/shared/utils/formatters";

export default function OverviewPage() {
  const { user } = useAuth();
  const recent = useApi(() => userApi.transactions(1, 5), []);
  if (!user) return null;

  return (
    <>
      <PageHeader title={`Xin chào, ${user.fullName}`} description="Tổng quan tài khoản của bạn." />

      <div className="grid gap-4 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="rounded-xl bg-brand-900 p-6 text-white">
          <div className="text-sm text-brand-200">Số dư ví</div>
          <div className="mt-2 font-serif text-4xl font-semibold tabular-nums">{formatMoney(user.balance)}</div>
          <Link to="/account/deposit" className={buttonClass({ className: "mt-6 !border-transparent !bg-white !text-brand-900 hover:!bg-brand-50" })}>
            <Plus size={16} /> Nạp tiền
          </Link>
        </div>

        <Card className="flex flex-col justify-between gap-4 p-6">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Email</dt>
              <dd className="truncate text-slate-800">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-slate-500">Tham gia</dt>
              <dd className="text-slate-800">{formatDate(user.createdAt)}</dd>
            </div>
          </dl>
          <Link to="/" className={buttonClass()}>
            <BookOpenCheck size={16} /> Vào luyện đề
          </Link>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader
          title="Giao dịch gần đây"
          action={
            <Link to="/account/transactions" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline">
              Xem tất cả <ArrowRight size={14} />
            </Link>
          }
        />
        {recent.loading && !recent.data ? (
          <Loading />
        ) : recent.error ? (
          <ErrorBox message={recent.error} onRetry={recent.reload} />
        ) : (
          recent.data && <TransactionTable items={recent.data.items} />
        )}
      </Card>
    </>
  );
}
