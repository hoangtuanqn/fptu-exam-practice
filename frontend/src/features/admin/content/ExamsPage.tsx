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
import { Pagination } from "@/shared/ui/Table";
import { useClampPage } from "@/shared/hooks/useClampPage";
import { errorMessage } from "@/shared/api/errors";

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
      toast.error(errorMessage(err, "Không bắt đầu được"));
    } finally {
      setStarting(null);
    }
  }

  // Một chip NGẮN, không xuống dòng: "50/50" (số câu có đáp án / số câu cần chấm), xanh khi đủ, đỏ khi thiếu
  const statusChip = (e: AdminExam) => {
    if (e.answerSource === "PENDING") return <Badge tone="info">Đang giải</Badge>;
    if (e.answerSource === "FAILED" || e.answerSource === "DEFAULT") return <Badge tone="danger">Chưa có</Badge>;
    if (e.gradedQuestions === undefined || e.answeredQuestions === undefined) return <Badge tone={SOURCE[e.answerSource][1]}>{SOURCE[e.answerSource][0]}</Badge>; // máy chủ cũ chưa trả số liệu
    return (
      <span title={`${e.answeredQuestions} trên ${e.gradedQuestions} câu cần chấm đã có đáp án (không tính tài liệu tham khảo)`}>
        <Badge tone={e.answeredQuestions >= e.gradedQuestions ? "success" : "danger"}>
          <span className="whitespace-nowrap tabular-nums">
            {e.answeredQuestions}/{e.gradedQuestions}
          </span>
        </Badge>
      </span>
    );
  };

  // Lỗi AI: tối đa 3 dòng; dài hơn thì có nút mở toàn văn
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

  return (
    <>
      <PageHeader eyebrow="Quản trị" title="Đề thi" description="Số câu có đáp án của từng đề. Đề thiếu đáp án hiện màu đỏ." />
      <Card>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && data.items.length > 0 ? (
          <>
            <div className="flex gap-3 border-b border-slate-100 px-4 py-2 text-xs font-medium text-slate-500">
              <span className="w-20 shrink-0">Có đáp án</span>
              <span>Đề</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {data.items.map((e) => (
                <li key={e.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
                  <div className="w-20 shrink-0">{statusChip(e)}</div>
                  <div className="min-w-0 flex-1 basis-56 space-y-1">
                    <div className="truncate text-sm font-medium text-slate-900" title={`Thread ${e.threadId}`}>
                      {e.title}
                    </div>
                    {errorLine(e)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={() => setReport(e.id)}>
                      Báo cáo
                    </Button>
                    <Button size="sm" onClick={() => void solve(e)} disabled={e.solving || starting === e.id}>
                      {e.solving || starting === e.id ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                      {e.solving ? "Đang giải…" : "AI giải lại"}
                    </Button>
                    <Link to={`/admin/exams/${e.id}`} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-sm font-medium text-brand-700 transition hover:bg-brand-100">
                      <PencilLine size={14} /> Xem & sửa
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
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
