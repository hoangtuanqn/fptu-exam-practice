import { Users } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { ReferralSettingsForm } from "@/features/admin/users/ReferralSettingsForm";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Card, CardHeader, PageHeader, StatCard, StatGrid } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatCredit, formatDate } from "@/shared/utils/formatters";

// Quản lý giới thiệu: cấu hình thưởng và hoa hồng, tổng đã chi, ai giới thiệu ai
export default function ReferralsPage() {
  const settings = useApi(() => adminApi.referralSettings(), []);
  const summary = useApi(() => adminApi.referralSummary(), []);

  const [url, setUrl] = useUrlState({ page: "1" });
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const list = useApi(() => adminApi.referrals(page), [page]);
  useClampPage(list.data?.meta, setPage);

  return (
    <>
      <PageHeader title="Giới thiệu thành viên" description="Cấu hình thưởng, hoa hồng và theo dõi ai đã giới thiệu ai." />

      <div className="space-y-6">
        {settings.data ? (
          <ReferralSettingsForm key={JSON.stringify(settings.data)} initial={settings.data} onSaved={() => { settings.reload(); summary.reload(); }} />
        ) : settings.loading ? (
          <Loading />
        ) : (
          <ErrorBox message={settings.error ?? "Không tải được cấu hình"} onRetry={settings.reload} />
        )}

        {summary.data && (
          <StatGrid className="grid-cols-1 sm:grid-cols-3">
            <StatCard label="Thành viên được giới thiệu" value={summary.data.referred} />
            <StatCard tone="amber" label="Đã chi thưởng đăng ký" value={formatCredit(summary.data.signupBonusPaid)} />
            <StatCard tone="emerald" label="Đã chi hoa hồng nạp tiền" value={formatCredit(summary.data.commissionPaid)} />
          </StatGrid>
        )}

        <Card>
          <CardHeader title="Danh sách được giới thiệu" />
          {list.loading && !list.data ? (
            <Loading />
          ) : list.error ? (
            <ErrorBox message={list.error} onRetry={list.reload} />
          ) : list.data && list.data.items.length > 0 ? (
            <div className={list.loading ? "opacity-60 transition" : "transition"}>
              <ul className="divide-y divide-slate-100 md:hidden">
                {list.data.items.map((r) => (
                  <li key={r.id} className="space-y-0.5 px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-sm font-medium text-slate-900">{r.fullName}</span>
                      <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-emerald-700">+{formatCredit(r.earned)}</span>
                    </div>
                    <div className="truncate text-xs text-slate-500">{r.email}</div>
                    <div className="truncate text-xs text-slate-400">
                      Giới thiệu bởi {r.referrer?.fullName ?? "—"} · {formatDate(r.joinedAt)}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <Table>
                  <Thead>
                    <Th>Được giới thiệu</Th>
                    <Th>Người giới thiệu</Th>
                    <Th>Tham gia</Th>
                    <Th className="text-right">Người giới thiệu đã nhận</Th>
                  </Thead>
                  <tbody>
                    {list.data.items.map((r) => (
                      <Tr key={r.id}>
                        <Td>
                          <div className="font-medium text-slate-800">{r.fullName}</div>
                          <div className="text-xs text-slate-500">{r.email}</div>
                        </Td>
                        <Td>
                          <div className="text-slate-800">{r.referrer?.fullName ?? "—"}</div>
                          <div className="text-xs text-slate-500">{r.referrer?.email}</div>
                        </Td>
                        <Td className="whitespace-nowrap text-slate-500">{formatDate(r.joinedAt)}</Td>
                        <Td className="text-right tabular-nums text-emerald-700">+{formatCredit(r.earned)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <Pagination meta={list.data.meta} onPage={setPage} />
            </div>
          ) : (
            <Empty icon={Users} title="Chưa có ai đăng ký qua mã giới thiệu" />
          )}
        </Card>
      </div>
    </>
  );
}
