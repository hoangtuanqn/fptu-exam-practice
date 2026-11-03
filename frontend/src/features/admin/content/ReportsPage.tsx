import { useState } from "react";
import { MessageSquareWarning } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { ReportReviewDialog } from "@/features/admin/content/ReportReviewDialog";
import { ReportStatusBadge } from "@/shared/components/StatusBadge";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import type { AnswerReportAdmin, ReportStatus } from "@/shared/types/api";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatDateTime } from "@/shared/utils/formatters";

type StatusFilter = ReportStatus | "";

// Báo cáo đáp án do người dùng gửi: mặc định hiện các báo cáo chờ duyệt
export default function ReportsPage() {
  const [url, setUrl] = useUrlState({ status: "PENDING", page: "1" });
  const status = url.status as StatusFilter;
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const { data, error, loading, reload } = useApi(() => adminApi.answerReports(page, status), [page, status]);
  useClampPage(data?.meta, setPage);
  const [selected, setSelected] = useState<AnswerReportAdmin | null>(null);

  return (
    <>
      <PageHeader title="Báo cáo đáp án" description="Duyệt các đáp án người dùng cho là sai. Duyệt đúng sẽ sửa đáp án và thưởng credit." />
      <Card>
        <div className="border-b border-slate-100 p-4">
          <Segmented<StatusFilter>
            label="Lọc theo trạng thái"
            value={status}
            onChange={(v) => setUrl({ status: v, page: "1" })}
            options={[
              { value: "PENDING", label: "Chờ duyệt" },
              { value: "APPROVED", label: "Đã duyệt" },
              { value: "REJECTED", label: "Từ chối" },
              { value: "", label: "Tất cả" },
            ]}
          />
        </div>

        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && data.items.length > 0 ? (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((r) => (
                <li key={r.id}>
                  <button onClick={() => setSelected(r)} className="block w-full space-y-1 px-4 py-3 text-left transition active:bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-slate-900">
                        {r.exam.title} · câu {r.questionNumber}
                      </span>
                      <ReportStatusBadge value={r.status} />
                    </div>
                    <div className="text-xs text-slate-600">
                      {r.currentAnswer} → <b className="text-emerald-700">{r.proposedAnswer}</b>
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      {r.user.fullName} · {formatDateTime(r.createdAt)}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <Thead>
                  <Th>Đề · câu</Th>
                  <Th>Đáp án</Th>
                  <Th>Người báo cáo</Th>
                  <Th>Trạng thái</Th>
                  <Th>Gửi lúc</Th>
                </Thead>
                <tbody>
                  {data.items.map((r) => (
                    <Tr key={r.id} onClick={() => setSelected(r)}>
                      <Td>
                        <div className="font-medium text-slate-800">{r.exam.title}</div>
                        <div className="text-xs text-slate-500">Câu {r.questionNumber}</div>
                      </Td>
                      <Td className="whitespace-nowrap">
                        {r.currentAnswer} → <b className="text-emerald-700">{r.proposedAnswer}</b>
                      </Td>
                      <Td>
                        <div className="text-slate-800">{r.user.fullName}</div>
                        <div className="text-xs text-slate-500">{r.user.email}</div>
                      </Td>
                      <Td>
                        <ReportStatusBadge value={r.status} />
                      </Td>
                      <Td className="whitespace-nowrap text-slate-500">{formatDateTime(r.createdAt)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination meta={data.meta} onPage={setPage} />
          </div>
        ) : (
          <Empty icon={MessageSquareWarning} title={status === "PENDING" ? "Không có báo cáo nào chờ duyệt" : "Không có báo cáo nào"} />
        )}
      </Card>

      {selected && <ReportReviewDialog report={selected} onClose={() => setSelected(null)} onDone={reload} />}
    </>
  );
}
