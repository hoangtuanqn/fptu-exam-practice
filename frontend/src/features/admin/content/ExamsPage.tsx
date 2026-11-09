import { useEffect, useState } from "react";
import { Copy, ExternalLink, FileText, Loader2, Sparkles } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
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

  // Chip NGẮN, không xuống dòng: "50/50" = số câu có đáp án / số câu cần chấm; xanh khi đủ, đỏ khi thiếu
  const answersChip = (e: AdminExam) => {
    if (e.gradedQuestions === undefined || e.answeredQuestions === undefined) return null; // máy chủ cũ chưa trả số liệu
    const full = e.answeredQuestions >= e.gradedQuestions;
    return (
      <span title={`${e.answeredQuestions} trên ${e.gradedQuestions} câu cần chấm đã có đáp án (không tính tài liệu tham khảo)`}>
        <Badge tone={full ? "success" : "danger"}>
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
          <button type="button" onClick={(ev) => { ev.stopPropagation(); setFullError({ title: `Lỗi AI · ${e.title}`, text: e.solveError! }); }} className="mt-0.5 font-medium underline underline-offset-2 hover:text-rose-800">
            Xem đầy đủ
          </button>
        )}
      </div>
    );

  // Thread trên FuOverflow: bấm mở bài gốc ở tab mới (để biết đề này là đề nào trên FuO)
  const threadLink = (e: AdminExam) =>
    e.sourceUrl ? (
      <a href={e.sourceUrl} target="_blank" rel="noreferrer" onClick={(ev) => ev.stopPropagation()} title="Mở bài gốc trên FuOverflow" className="inline-flex items-center gap-1 text-brand-700 hover:underline">
        {e.threadId} <ExternalLink size={12} />
      </a>
    ) : (
      <span>{e.threadId}</span>
    );

  // Thao tác gọn: hai nút biểu tượng (xem chi tiết/sửa là bấm vào dòng đề)
  const iconBtn = "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40";
  const action = (e: AdminExam) => {
    const busy = e.solving || starting === e.id;
    return (
      <div className="flex items-center justify-end gap-1.5">
        <button type="button" className={iconBtn} title="Báo cáo của AI" aria-label="Báo cáo của AI" onClick={(ev) => { ev.stopPropagation(); setReport(e.id); }}>
          <FileText size={15} />
        </button>
        <button type="button" className={iconBtn} title={busy ? "AI đang giải…" : "AI giải lại cả đề"} aria-label="AI giải lại cả đề" disabled={busy} onClick={(ev) => { ev.stopPropagation(); void solve(e); }}>
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
        </button>
      </div>
    );
  };

  return (
    <>
      <PageHeader eyebrow="Quản trị" title="Đề thi" description="Bấm vào một đề để xem và sửa đáp án. Mục Có đáp án đỏ là đề đang thiếu." />
      <Card>
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : data && data.items.length > 0 ? (
          <>
            <ul className="divide-y divide-slate-100 md:hidden">
              {data.items.map((e) => (
                <li key={e.id} className="space-y-2 px-4 py-3" onClick={() => navigate(`/admin/exams/${e.id}`)}>
                  <div className="truncate text-sm font-medium text-slate-900">{e.title}</div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {answersChip(e)}
                    <Badge tone={SOURCE[e.answerSource][1]}>{SOURCE[e.answerSource][0]}</Badge>
                    <span>{threadLink(e)}</span>
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
                  <Th>Có đáp án</Th>
                  <Th>Nguồn đáp án</Th>
                  <Th>Lấy lúc</Th>
                  <Th />
                </Thead>
                <tbody>
                  {data.items.map((e) => (
                    <Tr key={e.id} onClick={() => navigate(`/admin/exams/${e.id}`)}>
                      <Td className="max-w-xs">
                        <Link to={`/admin/exams/${e.id}`} className="block truncate font-medium text-slate-800 hover:text-brand-700" title={e.title} onClick={(ev) => ev.stopPropagation()}>
                          {e.title}
                        </Link>
                        {errorLine(e)}
                      </Td>
                      <Td className="whitespace-nowrap text-slate-500">{threadLink(e)}</Td>
                      <Td className="text-right tabular-nums">{e.totalQuestions}</Td>
                      <Td>{answersChip(e)}</Td>
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
