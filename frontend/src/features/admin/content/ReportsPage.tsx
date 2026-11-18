import { useEffect, useState } from "react";
import { CheckCheck, MessageSquareWarning } from "lucide-react";
import { adminApi, type ResolvedFilter } from "@/features/admin/api/admin.api";
import { ReportReviewDialog } from "@/features/admin/content/ReportReviewDialog";
import { refreshReviewCounts } from "@/features/admin/review-counts.store";
import { ResolvedBadge } from "@/features/admin/shared";
import { errorMessage } from "@/shared/api/errors";
import { ReportStatusBadge } from "@/shared/components/StatusBadge";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import type { AnswerReportAdmin, ReportStatus } from "@/shared/types/api";
import { Button } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Segmented } from "@/shared/ui/Segmented";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatDateTime } from "@/shared/utils/formatters";

// OPEN = chờ duyệt và chưa giải quyết; RESOLVED = đã giải quyết (mọi trạng thái)
type StatusFilter = ReportStatus | "OPEN" | "RESOLVED" | "";

const QUERY: Record<StatusFilter, [ReportStatus | "", ResolvedFilter]> = {
  OPEN: ["PENDING", "false"],
  PENDING: ["PENDING", ""],
  APPROVED: ["APPROVED", ""],
  REJECTED: ["REJECTED", ""],
  RESOLVED: ["", "true"],
  "": ["", ""],
};

// Báo cáo đáp án do người dùng gửi: mặc định hiện các báo cáo chờ duyệt chưa giải quyết
export default function ReportsPage() {
  const toast = useToast();
  const [url, setUrl] = useUrlState({ status: "OPEN", page: "1" });
  const status = (Object.prototype.hasOwnProperty.call(QUERY, url.status) ? url.status : "OPEN") as StatusFilter;
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const { data, error, loading, reload } = useApi(() => adminApi.answerReports(page, ...QUERY[status]), [page, status]);
  useClampPage(data?.meta, setPage);
  const [selected, setSelected] = useState<AnswerReportAdmin | null>(null);
  // Dòng vừa giải quyết hiện ngay kết quả server trả về; tải lại danh sách thì bỏ
  const [patched, setPatched] = useState<Record<string, AnswerReportAdmin>>({});
  useEffect(() => setPatched({}), [data]);
  const [saving, setSaving] = useState<string | null>(null);
  const items = data?.items.map((r) => patched[r.id] ?? r) ?? [];

  const resolve = async (id: string) => {
    setSaving(id);
    try {
      const row = await adminApi.resolveReport(id);
      setPatched((p) => ({ ...p, [id]: row }));
      toast.success("Đã đánh dấu đã giải quyết");
      void refreshReviewCounts();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(null);
    }
  };
  const resolveButton = (r: AnswerReportAdmin) => (
    <Button
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        void resolve(r.id);
      }}
      disabled={saving !== null || r.status !== "PENDING" || !!r.resolvedAt}
      aria-label={`Giải quyết báo cáo câu ${r.questionNumber}, ${r.exam.title}`}
      className="shrink-0"
    >
      <CheckCheck size={16} aria-hidden /> Giải quyết
    </Button>
  );

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
              { value: "OPEN", label: "Chưa xử lý" },
              { value: "PENDING", label: "Chờ duyệt" },
              { value: "APPROVED", label: "Đã duyệt" },
              { value: "REJECTED", label: "Từ chối" },
              { value: "RESOLVED", label: "Đã giải quyết" },
              { value: "", label: "Tất cả" },
            ]}
          />
        </div>

        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && items.length > 0 ? (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            <ul className="divide-y divide-slate-100 md:hidden">
              {items.map((r) => (
                <li key={r.id} className="flex items-center gap-2 pr-4">
                  <button onClick={() => setSelected(r)} className="block min-w-0 flex-1 space-y-1 px-4 py-3 text-left transition active:bg-slate-50">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate text-sm font-medium text-slate-900">
                        {r.exam.title} · câu {r.questionNumber}
                      </span>
                      <span className="flex shrink-0 gap-1">
                        <ReportStatusBadge value={r.status} />
                        <ResolvedBadge at={r.resolvedAt} />
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      {r.currentAnswer} → <b className="text-emerald-700">{r.proposedAnswer}</b>
                    </div>
                    <div className="truncate text-xs text-slate-400">
                      {r.user.fullName} · {formatDateTime(r.createdAt)}
                    </div>
                  </button>
                  {r.status === "PENDING" && !r.resolvedAt && resolveButton(r)}
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
                  <Th>
                    <span className="sr-only">Thao tác</span>
                  </Th>
                </Thead>
                <tbody>
                  {items.map((r) => (
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
                        <div className="flex flex-wrap gap-1">
                          <ReportStatusBadge value={r.status} />
                          <ResolvedBadge at={r.resolvedAt} />
                        </div>
                        {r.resolvedAt && <div className="mt-1 text-xs text-slate-500">{formatDateTime(r.resolvedAt)}</div>}
                      </Td>
                      <Td className="whitespace-nowrap text-slate-500">{formatDateTime(r.createdAt)}</Td>
                      <Td className="text-right">{r.status === "PENDING" && !r.resolvedAt && resolveButton(r)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination meta={data.meta} onPage={setPage} />
          </div>
        ) : (
          <Empty
            icon={MessageSquareWarning}
            title={status === "OPEN" ? "Không có báo cáo nào chưa xử lý" : status === "PENDING" ? "Không có báo cáo nào chờ duyệt" : "Không có báo cáo nào"}
          />
        )}
      </Card>

      {selected && (
        <ReportReviewDialog
          report={patched[selected.id] ?? selected}
          onClose={() => setSelected(null)}
          onDone={() => {
            reload();
            void refreshReviewCounts();
          }}
          onResolve={() => resolve(selected.id)}
          resolving={saving === selected.id}
        />
      )}
    </>
  );
}
