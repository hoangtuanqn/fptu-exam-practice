import { Link } from "react-router-dom";
import { AlertTriangle, Banknote, Clock, TrendingUp, UserCheck, UserX } from "lucide-react";
import { adminApi } from "../../api/admin.api";
import { Card, PageHeader, StatCard } from "../../components/ui/Card";
import { ErrorBox, Loading } from "../../components/ui/Feedback";
import { useApi } from "../../hooks/useApi";
import { formatMoney } from "../../utils/formatters";

export default function DashboardPage() {
  const { data, error, loading, reload } = useApi(() => adminApi.dashboard(), []);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Không có dữ liệu"} onRetry={reload} />;
  const { users, deposits } = data;

  return (
    <>
      <PageHeader title="Tổng quan" description="Tình hình thành viên và dòng tiền nạp." />

      {deposits.unmatchedTransactions > 0 && (
        <Link
          to="/admin/bank-transactions"
          className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 hover:bg-amber-100/70"
        >
          <AlertTriangle size={18} className="shrink-0" />
          <span>
            Có <b>{deposits.unmatchedTransactions}</b> giao dịch tiền vào chưa khớp lệnh nạp nào. Bấm để xem và xử lý.
          </span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard icon={Banknote} label="Nạp hôm nay" value={formatMoney(deposits.todayDeposited)} />
        <StatCard icon={TrendingUp} label="Tổng đã nạp" value={formatMoney(deposits.totalDeposited)} />
        <StatCard icon={Clock} label="Lệnh chờ thanh toán" value={deposits.pending} note={`${deposits.paid} đã thanh toán · ${deposits.expired} hết hạn`} />
        <StatCard icon={UserCheck} label="Thành viên hoạt động" value={users.active} />
        <StatCard icon={UserX} label="Thành viên bị khoá" value={users.banned} />
      </div>

      <Card className="mt-6 p-5 text-sm text-slate-600">
        Chưa nạp được tiền? Vào <Link to="/admin/settings" className="font-medium text-brand-700 hover:underline">Cấu hình SePay</Link> để
        nhập API token, số tài khoản và bật cron đối soát.
      </Card>
    </>
  );
}
