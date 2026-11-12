import { useState, type FormEvent } from "react";
import { Gift, Loader2, Users } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/shared/context/ToastContext";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { Button } from "@/shared/ui/Button";
import { FormError } from "@/shared/ui/Feedback";
import { Input } from "@/shared/ui/Input";
import { referralApi } from "@/features/referral/referral.api";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Card, CardHeader, PageHeader, StatCard, StatGrid } from "@/shared/ui/Card";
import { RouteTabs, WALLET_TABS } from "@/shared/ui/RouteTabs";
import { CopyButton } from "@/shared/ui/CopyButton";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatCredit, formatDate } from "@/shared/utils/formatters";

// Nhập mã của người đã giới thiệu bạn sau khi đăng ký (trong hạn). Quá hạn thì mất quyền.
function ClaimCard({ claim, bonus, onDone }: { claim: { status: string; deadline: string | null }; bonus: number; onDone: () => void }) {
  const toast = useToast();
  const { refresh } = useAuth();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [code, setCode] = useState("");

  if (claim.status !== "open") return null;
  const daysLeft = claim.deadline ? Math.max(0, Math.ceil((new Date(claim.deadline).getTime() - Date.now()) / 86_400_000)) : 0;

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const r = await referralApi.claim(code);
      toast.success(r.bonus > 0 ? `Đã nhập mã, nhận ${formatCredit(r.bonus)}` : "Đã nhập mã giới thiệu");
      await refresh();
      onDone();
    });
  };

  return (
    <Card>
      <CardHeader title="Bạn được ai giới thiệu?" description={`Nhập mã của người giới thiệu để nhận ${formatCredit(bonus)}. Còn ${daysLeft} ngày, sau đó sẽ không nhập được nữa.`} />
      <form onSubmit={onSubmit} className="space-y-3 p-5" noValidate>
        <FormError message={error} />
        <Input
          label="Mã giới thiệu"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          error={fieldErrors.code}
          placeholder="Ví dụ J2PP4G9W"
          autoComplete="off"
          spellCheck={false}
          maxLength={12}
        />
        <Button variant="primary" type="submit" disabled={loading || code.trim().length < 4}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Gift size={16} />}
          Nhập mã
        </Button>
      </form>
    </Card>
  );
}

// Giới thiệu bạn bè: chia sẻ liên kết, nhận hoa hồng mỗi khi người được giới thiệu nạp credit
export default function ReferralPage() {
  const [url, setUrl] = useUrlState({ page: "1" });
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const { data, error, loading, reload } = useApi(() => referralApi.me(page), [page]);
  useClampPage(data?.meta, setPage);

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Không tải được dữ liệu"} onRetry={reload} />;

  const link = `${window.location.origin}/register?ref=${data.code}`;
  const { program } = data;

  return (
    <>
      <div className="mb-4">
        <RouteTabs label="Ví" tabs={WALLET_TABS} />
      </div>
      <PageHeader
        title="Giới thiệu bạn bè"
        description={
          program.enabled
            ? `Bạn bè đăng ký bằng liên kết của bạn nhận ${formatCredit(program.signupBonus)}. Mỗi lần họ nạp credit, bạn nhận ${program.commissionPercent}% số tiền họ nạp.`
            : "Chương trình giới thiệu đang tạm dừng."
        }
      />

      <Card>
        <CardHeader title="Liên kết giới thiệu của bạn" description="Gửi liên kết này cho bạn bè. Họ đăng ký xong là được tính vào danh sách của bạn." />
        <div className="space-y-3 p-5">
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{link}</span>
            <CopyButton text={link} label="Sao chép liên kết" />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            Mã giới thiệu:
            <b className="tracking-wider text-slate-900">{data.code}</b>
            <CopyButton text={data.code} label="Sao chép mã" />
          </div>
        </div>
      </Card>

      <div className="mt-6">
        <ClaimCard claim={data.claim} bonus={program.signupBonus} onDone={reload} />
      </div>

      <StatGrid className="mt-6 grid-cols-2">
        <StatCard label="Đã giới thiệu" value={data.stats.referred} note="người" />
        <StatCard tone="emerald" label="Đã nhận" value={formatCredit(data.stats.earned)} note="hoa hồng và thưởng" />
      </StatGrid>

      <div className="mt-6">
        <Card>
          <CardHeader title="Người bạn đã giới thiệu" />
          {data.items.length > 0 ? (
            <>
              <ul className="divide-y divide-slate-100 md:hidden">
                {data.items.map((m) => (
                  <li key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900">{m.name}</div>
                      <div className="truncate text-xs text-slate-500">{m.email}</div>
                      <div className="text-xs text-slate-400">Tham gia {formatDate(m.joinedAt)}</div>
                    </div>
                    <span className="shrink-0 whitespace-nowrap text-sm font-semibold tabular-nums text-emerald-700">+{formatCredit(m.earned)}</span>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block">
                <Table>
                  <Thead>
                    <Th>Thành viên</Th>
                    <Th>Email</Th>
                    <Th>Tham gia</Th>
                    <Th className="text-right">Bạn đã nhận</Th>
                  </Thead>
                  <tbody>
                    {data.items.map((m) => (
                      <Tr key={m.id}>
                        <Td className="font-medium text-slate-800">{m.name}</Td>
                        <Td className="text-slate-500">{m.email}</Td>
                        <Td className="whitespace-nowrap text-slate-500">{formatDate(m.joinedAt)}</Td>
                        <Td className="text-right tabular-nums text-emerald-700">+{formatCredit(m.earned)}</Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              <Pagination meta={data.meta} onPage={setPage} />
            </>
          ) : (
            <Empty icon={Users} title="Bạn chưa giới thiệu ai">
              Chia sẻ liên kết phía trên để bắt đầu nhận hoa hồng.
            </Empty>
          )}
        </Card>
      </div>
    </>
  );
}
