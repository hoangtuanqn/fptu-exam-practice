import { useEffect, useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { adminApi } from "@/features/admin/api/admin.api";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { toPage, useUrlState } from "@/shared/hooks/useUrlState";
import type { AdminExam, AnswerSource } from "@/shared/types/api";
import { Badge, type Tone } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { Pagination, Table, Td, Th, Thead, Tr } from "@/shared/ui/Table";
import { formatDateTime } from "@/shared/utils/formatters";

const SOURCE: Record<AnswerSource, [string, Tone]> = {
  DEFAULT: ["Đáp án tạm (A)", "warning"],
  AI: ["AI giải", "success"],
  MANUAL: ["Chỉnh tay", "info"],
};

function ReportDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, error, loading } = useApi(() => adminApi.examReport(id), [id]);
  return (
    <Modal onClose={onClose}>
      <ModalTitle icon={FileText}>Báo cáo của AI</ModalTitle>
      <div className="mt-3 max-h-[55vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
        {loading ? "Đang tải…" : error ? error : (data?.aiReport ?? "Chưa có báo cáo (đề này chưa được AI giải).")}
      </div>
      <ModalActions>
        <Button grow onClick={onClose}>
          Đóng
        </Button>
      </ModalActions>
    </Modal>
  );
}

export default function ExamsPage() {
  const toast = useToast();
  const [url, setUrl] = useUrlState({ page: "1" });
  const page = toPage(url.page);
  const { data, error, loading, reload } = useApi(() => adminApi.exams(page), [page]);
  const [report, setReport] = useState<number | null>(null);
  const [starting, setStarting] = useState<number | null>(null);

  // Có đề đang được AI giải thì hỏi lại định kỳ để thấy khi xong
  const anySolving = data?.items.some((e) => e.solving) ?? false;
  useEffect(() => {
    if (!anySolving) return;
    const id = setInterval(reload, 6000);
    return () => clearInterval(id);
  }, [anySolving, reload]);

  async function solve(exam: AdminExam) {
    setStarting(exam.id);
    try {
      await adminApi.solveExam(exam.id);
      toast.success("AI đang giải lại đáp án, có thể mất vài phút");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không bắt đầu được");
    } finally {
      setStarting(null);
    }
  }

  const action = (e: AdminExam) => (
    <div className="flex items-center justify-end gap-2">
      <Button size="sm" onClick={() => setReport(e.id)}>
        Báo cáo
      </Button>
      <Button size="sm" variant="primary" onClick={() => void solve(e)} disabled={e.solving || starting === e.id}>
        {e.solving || starting === e.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {e.solving ? "Đang giải…" : "AI giải lại"}
      </Button>
    </div>
  );

  return (
    <>
      <PageHeader eyebrow="Quản trị" title="Đề thi" description="Các đề đã lấy về, nguồn đáp án và nhờ AI giải lại." />
      <Card>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && data.items.length > 0 ? (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((e) => (
                <li key={e.id} className="space-y-2 px-4 py-3">
                  <div className="truncate text-sm font-medium text-slate-900">{e.title}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <Badge tone={SOURCE[e.answerSource][1]}>{SOURCE[e.answerSource][0]}</Badge>
                    <span>
                      Thread {e.threadId} · {e.totalQuestions} câu
                    </span>
                  </div>
                  {e.solveError && <div className="text-xs text-rose-600">Lần giải gần nhất lỗi: {e.solveError}</div>}
                  {action(e)}
                </li>
              ))}
            </ul>
            <div className="hidden md:block">
              <Table>
                <Thead>
                  <Th>Đề</Th>
                  <Th>Thread</Th>
                  <Th className="text-right">Số câu</Th>
                  <Th>Nguồn đáp án</Th>
                  <Th>Lấy lúc</Th>
                  <Th />
                </Thead>
                <tbody>
                  {data.items.map((e) => (
                    <Tr key={e.id}>
                      <Td className="max-w-xs">
                        <div className="truncate font-medium text-slate-800">{e.title}</div>
                        {e.solveError && <div className="truncate text-xs text-rose-600">Lỗi AI: {e.solveError}</div>}
                      </Td>
                      <Td className="text-slate-500">{e.threadId}</Td>
                      <Td className="text-right tabular-nums">{e.totalQuestions}</Td>
                      <Td>
                        <Badge tone={SOURCE[e.answerSource][1]}>{SOURCE[e.answerSource][0]}</Badge>
                      </Td>
                      <Td className="whitespace-nowrap text-slate-500">{formatDateTime(e.createdAt)}</Td>
                      <Td>{action(e)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
            <Pagination meta={data.meta} onPage={(p) => setUrl({ page: String(p) })} />
          </>
        ) : (
          <Empty icon={FileText} title="Chưa có đề nào" />
        )}
      </Card>

      {report !== null && <ReportDialog id={report} onClose={() => setReport(null)} />}
    </>
  );
}
