import { useState, type FormEvent } from "react";
import { DatabaseZap, Loader2 } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { UserCell, UserFilterChip } from "@/features/admin/shared";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { useSubmit } from "@/shared/hooks/useSubmit";
import { useUrlSearch } from "@/shared/hooks/useUrlSearch";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import type { AdminCrawlJob, CrawlerSettings, CrawlJobStatus } from "@/shared/types/api";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { ExpandableText } from "@/shared/ui/ExpandableText";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { Input } from "@/shared/ui/Input";
import { SearchBox } from "@/shared/ui/SearchBox";
import { Empty, ErrorBox, FormError, Loading } from "@/shared/ui/Feedback";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatCredit, formatDateTime } from "@/shared/utils/formatters";

const STATUS: Record<CrawlJobStatus, [string, Tone]> = {
  QUEUED: ["Đang chờ", "warning"],
  RUNNING: ["Đang chạy", "info"],
  DONE: ["Xong", "success"],
  FAILED: ["Lỗi", "danger"],
};

const Who = ({ job }: { job: AdminCrawlJob }) => (job.user ? <UserCell user={job.user} /> : <span className="text-slate-500">{job.guest ? "Khách (chưa đăng nhập)" : "—"}</span>);

function FetchPriceForm({ initial, onSaved }: { initial: CrawlerSettings; onSaved: () => void }) {
  const toast = useToast();
  const { run, loading, error, fieldErrors } = useSubmit();
  const [fetchPrice, setFetchPrice] = useState(String(initial.fetchPrice ?? 0));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      await adminApi.saveCrawlerSettings({ fetchPrice: Number(fetchPrice) });
      toast.success("Đã lưu phí mở đề");
      onSaved();
    });
  };

  return (
    <Card>
      <CardHeader title="Phí mở đề" description="Số credit trừ mỗi lần thành viên mở một đề chưa có trong kho của mình. Đề PE có giá riêng." />
      <form onSubmit={onSubmit} className="max-w-md space-y-5 p-5" noValidate>
        <FormError message={error} />
        <Input
          label="Phí mỗi đề (credit)"
          inputMode="numeric"
          value={fetchPrice}
          onChange={(e) => setFetchPrice(e.target.value.replace(/\D/g, "").slice(0, 7))}
          error={fieldErrors.fetchPrice}
          hint="0 = miễn phí. Thành viên Pro không bị trừ phí."
        />
        <Button variant="primary" type="submit" disabled={loading || fetchPrice === ""}>
          {loading && <Loader2 size={16} className="animate-spin" />}
          Lưu phí
        </Button>
      </form>
    </Card>
  );
}

// Lịch sử lấy đề (dữ liệu cũ): ai lấy, đề nào, kết quả, phí đã trừ và lỗi nếu có
export default function CrawlJobsPage() {
  const [url, setUrl] = useUrlState({ q: "", status: "", userId: "", page: "1" });
  const status = url.status as CrawlJobStatus | "";
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });

  // Ô tìm kiếm gõ trực tiếp, sau khi ngừng gõ mới đưa lên URL (và về trang 1)
  const [search, setSearch, q] = useUrlSearch(url.q, setUrl);

  const { data, error, loading, reload } = useApi(() => adminApi.crawlJobs({ page, search: q, status, userId: url.userId }), [page, q, status, url.userId]);
  useClampPage(data?.meta, setPage);
  const who = url.userId ? data?.items.find((j) => j.user)?.user : undefined;
  const settings = useApi(() => adminApi.crawlerSettings(), []);

  return (
    <>
      <PageHeader title="Lịch sử lấy đề" description="Phí mở đề và các lượt lấy đề trước đây của thành viên và khách." />
      <div className="space-y-6">
      {settings.data ? (
        <FetchPriceForm key={JSON.stringify(settings.data)} initial={settings.data} onSaved={settings.reload} />
      ) : settings.loading ? (
        <Loading />
      ) : (
        <ErrorBox message={settings.error ?? "Không tải được phí mở đề"} onRetry={settings.reload} />
      )}
      <Card>
        <div className="panel-filter-row">
          <SearchBox value={search} onChange={setSearch} placeholder="Tìm theo tên hoặc email" label="Tìm thành viên" />
          <Segmented
            label="Lọc theo trạng thái"
            value={status}
            onChange={(v: CrawlJobStatus | "") => setUrl({ status: v, page: "1" })}
            options={[
              { value: "", label: "Tất cả" },
              { value: "DONE", label: "Xong" },
              { value: "FAILED", label: "Lỗi" },
              { value: "RUNNING", label: "Đang chạy" },
              { value: "QUEUED", label: "Đang chờ" },
            ]}
          />
          <UserFilterChip userId={url.userId} label={who?.fullName} onClear={() => setUrl({ userId: "", page: "1" })} />
        </div>

        {loading && !data ? (
          <Loading shape="table" />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && data.items.length > 0 ? (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((j) => (
                <li key={j.id} className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-slate-900">{j.exam?.title ?? `Thread ${j.threadId}`}</span>
                    <Badge tone={STATUS[j.status][1]}>{STATUS[j.status][0]}</Badge>
                  </div>
                  <div className="mt-0.5 truncate text-xs text-slate-500">{j.user ? `${j.user.fullName} · ${j.user.email}` : j.guest ? "Khách (chưa đăng nhập)" : "—"}</div>
                  {j.error && <div className="mt-0.5 text-xs text-rose-600">{j.error}</div>}
                  <div className="mt-0.5 text-xs text-slate-500">
                    {formatDateTime(j.createdAt)} · phí {formatCredit(j.chargedAmount)}
                  </div>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <Thead>
                  <Th>Thời gian</Th>
                  <Th>Người lấy</Th>
                  <Th>Đề</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">Phí</Th>
                  <Th>Lỗi</Th>
                </Thead>
                <tbody>
                  {data.items.map((j) => (
                    <Tr key={j.id}>
                      <Td className="whitespace-nowrap text-slate-500">{formatDateTime(j.createdAt)}</Td>
                      <Td>
                        <Who job={j} />
                      </Td>
                      <Td>
                        <div className="max-w-xs truncate font-medium text-slate-800">{j.exam?.title ?? "—"}</div>
                        <div className="text-xs text-slate-500">Thread {j.threadId}</div>
                      </Td>
                      <Td>
                        <Badge tone={STATUS[j.status][1]}>{STATUS[j.status][0]}</Badge>
                      </Td>
                      <Td className="whitespace-nowrap text-right tabular-nums">{formatCredit(j.chargedAmount)}</Td>
                      <Td className="w-full min-w-44 text-rose-600">{j.error ? <ExpandableText text={j.error} /> : ""}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination meta={data.meta} onPage={setPage} />
          </div>
        ) : (
          <Empty icon={DatabaseZap} title="Chưa có lượt lấy đề nào" />
        )}
      </Card>
      </div>
    </>
  );
}
