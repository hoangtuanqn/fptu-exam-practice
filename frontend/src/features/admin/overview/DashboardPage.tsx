import { Link } from "react-router-dom";
import { AlertTriangle, ArrowRight, Receipt, Users } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { DepositStatusBadge, RoleBadge } from "@/shared/components/StatusBadge";
import { useApi } from "@/shared/hooks/useApi";
import { Card, CardHeader, PageHeader, StatCard, StatGrid } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { formatDate, formatDateTime, formatMoney, initials } from "@/shared/utils/formatters";

const QUICK = [
  { to: "/admin/users", label: "Quản lý thành viên", note: "Phân quyền, khoá, chỉnh số dư" },
  { to: "/admin/settings", label: "Cấu hình SePay", note: "Token, tài khoản nhận, cron đối soát" },
  { to: "/admin/crawler", label: "Cấu hình crawl", note: "Cookie FuOverflow và giá lấy đề" },
  { to: "/admin/bank-transactions", label: "Giao dịch ngân hàng", note: "Đối chiếu tiền vào chưa khớp" },
];

const seeAll = (to: string) => (
  <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-slate-900 underline-offset-4 hover:text-brand-700 hover:underline">
    Xem tất cả <ArrowRight size={14} />
  </Link>
);

export default function DashboardPage() {
  const { data, error, loading, reload } = useApi(() => adminApi.dashboard(), []);
  const deposits = useApi(() => adminApi.deposits(1, ""), []);
  const users = useApi(() => adminApi.users({ page: 1 }), []);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Không có dữ liệu"} onRetry={reload} />;
  const stats = { users: data.users, deposits: data.deposits };

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Quản trị" title="Tổng quan" description="Tình hình thành viên và dòng tiền nạp." />

      {stats.deposits.unmatchedTransactions > 0 && (
        <Link
          to="/admin/bank-transactions"
          className="flex items-center gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 transition hover:bg-amber-100/70"
        >
          <AlertTriangle size={17} className="shrink-0" />
          <span>
            Có <b>{stats.deposits.unmatchedTransactions}</b> giao dịch tiền vào chưa khớp lệnh nạp nào. Bấm để xem và xử lý.
          </span>
          <ArrowRight size={16} className="ml-auto shrink-0" />
        </Link>
      )}

      <StatGrid className="grid-cols-2 xl:grid-cols-3">
        <StatCard label="Nạp hôm nay" value={formatMoney(stats.deposits.todayDeposited)} />
        <StatCard tone="emerald" label="Tổng đã nạp" value={formatMoney(stats.deposits.totalDeposited)} />
        <StatCard
          tone="amber"
          label="Lệnh chờ thanh toán"
          value={stats.deposits.pending}
          note={`${stats.deposits.paid} đã thanh toán · ${stats.deposits.expired} hết hạn`}
        />
        <StatCard tone="emerald" label="Thành viên hoạt động" value={stats.users.active} />
        <StatCard tone="rose" label="Thành viên bị khoá" value={stats.users.banned} />
        <StatCard tone="slate" label="Tổng lệnh nạp" value={stats.deposits.pending + stats.deposits.paid + stats.deposits.expired} />
      </StatGrid>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Lệnh nạp gần đây" action={seeAll("/admin/deposits")} />
          {deposits.loading && !deposits.data ? (
            <Loading />
          ) : !deposits.data || deposits.data.items.length === 0 ? (
            <Empty icon={Receipt} title="Chưa có lệnh nạp nào" />
          ) : (
            <ul className="divide-y divide-slate-200">
              {deposits.data.items.slice(0, 5).map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">{o.user?.fullName}</div>
                    <div className="mt-0.5 text-xs text-slate-500">
                      {o.code} · {formatDateTime(o.createdAt)}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-medium tabular-nums text-slate-900">{formatMoney(o.amount)}</span>
                    <DepositStatusBadge value={o.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Thành viên mới" action={seeAll("/admin/users")} />
          {users.loading && !users.data ? (
            <Loading />
          ) : !users.data || users.data.items.length === 0 ? (
            <Empty icon={Users} title="Chưa có thành viên nào" />
          ) : (
            <ul className="divide-y divide-slate-200">
              {users.data.items.slice(0, 5).map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                    {initials(u.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-900">{u.fullName}</div>
                    <div className="mt-0.5 truncate text-xs text-slate-500">
                      {u.email} · {formatDate(u.createdAt)}
                    </div>
                  </div>
                  <RoleBadge value={u.role} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <section>
        <h2 className="eyebrow mb-3">Lối tắt</h2>
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {QUICK.map(({ to, label, note }) => (
            <li key={to}>
              <Link to={to} className="group flex items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-slate-900">{label}</div>
                  <div className="text-xs text-slate-500">{note}</div>
                </div>
                <ArrowRight size={15} className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-900" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
