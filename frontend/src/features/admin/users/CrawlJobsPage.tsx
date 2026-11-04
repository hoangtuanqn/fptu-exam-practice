import { DatabaseZap, Search } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { UserCell, UserFilterChip } from "@/features/admin/shared";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { useUrlSearch } from "@/shared/hooks/useUrlSearch";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import type { AdminCrawlJob, CrawlJobStatus } from "@/shared/types/api";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { inputClass } from "@/shared/ui/Input";
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

// Lịch sử lấy đề từ FuOverflow: ai lấy, đề nào, kết quả, phí đã trừ và lỗi nếu có
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

  return (
    <>
      <PageHeader title="Lịch sử lấy đề" description="Các lượt lấy đề từ FuOverflow của thành viên và khách." />
      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-52 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm theo tên hoặc email" aria-label="Tìm thành viên" className={`${inputClass()} pl-9`} />
          </div>
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
          <Loading />
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
                  <div className="mt-0.5 text-xs text-slate-400">
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
                      <Td className="max-w-xs truncate text-rose-600" title={j.error ?? undefined}>
                        {j.error ?? ""}
                      </Td>
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
    </>
  );
}
