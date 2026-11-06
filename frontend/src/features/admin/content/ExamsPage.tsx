import { useEffect, useState } from "react";
import { Copy, FileText, Loader2, PencilLine, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
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
import { useClampPage } from "@/shared/hooks/useClampPage";

const SOURCE: Record<AnswerSource, [string, Tone]> = {
  PENDING: ["AI đang giải", "info"],
  FAILED: ["AI lỗi, chưa có đáp án", "danger"],
  DEFAULT: ["Chưa có đáp án", "danger"],
  AI: ["AI giải", "success"],
  MANUAL: ["Chỉnh tay", "info"],
};

// Xem trọn một đoạn văn dài (lỗi AI, báo cáo): cuộn được, giữ nguyên xuống dòng, có nút sao chép để gửi đi tra cứu
function FullTextDialog({ title, text, loading, onClose }: { title: string; text: string; loading?: boolean; onClose: () => void }) {
  const toast = useToast();
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Đã sao chép");
    } catch {
      toast.error("Không sao chép được, hãy bôi đen và copy thủ công");
    }
  }
  return (
    <Modal onClose={onClose}>
      <ModalTitle icon={FileText}>{title}</ModalTitle>
      <div className="mt-3 max-h-[55vh] select-text overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
        {loading ? "Đang tải…" : text}
      </div>
      <ModalActions>
        <Button onClick={() => void copy()} disabled={loading || !text}>
          <Copy size={14} /> Sao chép
        </Button>
        <Button grow onClick={onClose}>
          Đóng
        </Button>
      </ModalActions>
    </Modal>
  );
}

function ReportDialog({ id, onClose }: { id: number; onClose: () => void }) {
  const { data, error, loading } = useApi(() => adminApi.examReport(id), [id]);
  return <FullTextDialog title="Báo cáo của AI" loading={loading} text={error ? error : (data?.aiReport ?? "Chưa có báo cáo (đề này chưa được AI giải).")} onClose={onClose} />;
}

export default function ExamsPage() {
  const toast = useToast();
  const [url, setUrl] = useUrlState({ page: "1" });
  const page = toPage(url.page);
  const { data, error, loading, reload } = useApi(() => adminApi.exams(page), [page]);
  useClampPage(data?.meta, (p) => setUrl({ page: String(p) }));
  const [report, setReport] = useState<number | null>(null);
  const [fullError, setFullError] = useState<{ title: string; text: string } | null>(null); // lỗi AI đang xem toàn văn
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

  // Lỗi AI: xuống dòng, tối đa 3 dòng; dài hơn thì có nút mở toàn văn (không còn bị cắt mất nội dung)
  const errorLine = (e: AdminExam) =>
    e.solveError && (
      <div className="text-xs text-rose-600">
        <p className="line-clamp-3 break-words">Lỗi AI: {e.solveError}</p>
        {e.solveError.length > 90 && (
          <button type="button" onClick={() => setFullError({ title: `Lỗi AI · ${e.title}`, text: e.solveError! })} className="mt-0.5 font-medium underline underline-offset-2 hover:text-rose-800">
            Xem đầy đủ
          </button>
        )}
      </div>
    );

  const action = (e: AdminExam) => (
    <div className="flex items-center justify-end gap-2">
      <Link to={`/admin/exams/${e.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-100">
        <PencilLine size={14} /> Xem & sửa
      </Link>
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
                  {errorLine(e)}
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
                        <div className="truncate font-medium text-slate-800" title={e.title}>
                          {e.title}
                        </div>
                        {errorLine(e)}
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
      {fullError && <FullTextDialog title={fullError.title} text={fullError.text} onClose={() => setFullError(null)} />}
    </>
  );
}
