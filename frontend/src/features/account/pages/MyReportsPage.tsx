import { MessageSquareWarning } from "lucide-react";
import { answerReportApi } from "@/features/answer-report/answer-report.api";
import { REPORT_REWARD } from "@/features/answer-report/config";
import { ReportStatusBadge } from "@/shared/components/StatusBadge";
import { useApi } from "@/shared/hooks/useApi";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatCredit, formatDate } from "@/shared/utils/formatters";

// Các báo cáo đáp án sai bạn đã gửi và kết quả duyệt
export default function MyReportsPage() {
  const [url, setUrl] = useUrlState({ page: "1" });
  const page = toPage(url.page);
  const setPage = (p: number) => setUrl({ page: String(p) });
  const { data, error, loading, reload } = useApi(() => answerReportApi.mine(page), [page]);
  useClampPage(data?.meta, setPage);

  return (
    <>
      <PageHeader title="Báo cáo đáp án" description={`Mỗi báo cáo được xác nhận chính xác nhận ${formatCredit(REPORT_REWARD)}. Gửi báo cáo ngay trong lúc xem kết quả từng câu.`} />
      <Card>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && data.items.length > 0 ? (
          <div className={loading ? "opacity-60 transition" : "transition"}>
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((r) => (
                <li key={r.id} className="space-y-1 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-sm font-medium text-slate-900">
                      {r.exam.title} · câu {r.questionNumber}
                    </span>
                    <ReportStatusBadge value={r.status} />
                  </div>
                  <div className="text-xs text-slate-500">
                    Đề xuất: <b className="text-slate-800">{r.proposedAnswer}</b> · {formatDate(r.createdAt)}
                  </div>
                  {r.status === "APPROVED" && <div className="text-xs font-medium text-emerald-700">+{formatCredit(r.reward)}</div>}
                  {r.reviewNote && <div className="text-xs text-slate-500">Ghi chú: {r.reviewNote}</div>}
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <Thead>
                  <Th>Đề</Th>
                  <Th>Câu</Th>
                  <Th>Đề xuất</Th>
                  <Th>Trạng thái</Th>
                  <Th className="text-right">Thưởng</Th>
                  <Th>Gửi lúc</Th>
                </Thead>
                <tbody>
                  {data.items.map((r) => (
                    <Tr key={r.id}>
                      <Td>
                        <div className="font-medium text-slate-800">{r.exam.title}</div>
                        {r.reviewNote && <div className="text-xs text-slate-500">Ghi chú: {r.reviewNote}</div>}
                      </Td>
                      <Td className="tabular-nums">{r.questionNumber}</Td>
                      <Td className="font-medium text-slate-800">{r.proposedAnswer}</Td>
                      <Td>
                        <ReportStatusBadge value={r.status} />
                      </Td>
                      <Td className="text-right tabular-nums text-emerald-700">{r.status === "APPROVED" ? `+${formatCredit(r.reward)}` : "—"}</Td>
                      <Td className="whitespace-nowrap text-slate-500">{formatDate(r.createdAt)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination meta={data.meta} onPage={setPage} />
          </div>
        ) : (
          <Empty icon={MessageSquareWarning} title="Bạn chưa gửi báo cáo nào">
            Thấy đáp án sai? Bấm “Báo cáo” ở câu hỏi sau khi xem kết quả.
          </Empty>
        )}
      </Card>
    </>
  );
}
