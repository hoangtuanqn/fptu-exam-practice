import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ChevronRight, Pencil } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { Badge } from "@/shared/ui/Badge";
import { buttonClass } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { insightsApi } from "./insights.api";

const pct = (x: number) => `${Math.round(x * 100)}%`;

// Chất lượng đề: đề nào hay bị báo lỗi đáp án, và trong đề, câu nào nhiều người sai hoặc đa số chọn khác đáp án (có thể đáp án AI sai)
export default function QualityPage() {
  const [url, setUrl] = useUrlState({ exam: "" });
  const examId = Number(url.exam) || 0;
  return examId ? <ExamDetail id={examId} onBack={() => setUrl({ exam: "" })} /> : <ExamList onOpen={(id) => setUrl({ exam: String(id) })} />;
}

function ExamList({ onOpen }: { onOpen: (id: number) => void }) {
  const { data, error, loading, reload } = useApi(() => insightsApi.exams(), []);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Phân tích" title="Chất lượng đề" description="Đề có báo cáo đáp án chưa xử lý hoặc nhiều người làm được xếp lên đầu. Mở một đề để xem câu nào đáng kiểm tra." />
      <Card>
        <CardHeader title="Đề cần chú ý" />
        {loading && !data ? (
          <Loading />
        ) : error ? (
          <ErrorBox message={error} onRetry={reload} />
        ) : !data || data.length === 0 ? (
          <Empty title="Chưa có dữ liệu">Khi người dùng nộp bài hoặc báo cáo đáp án, các đề sẽ hiện ở đây.</Empty>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {data.map((e) => (
              <li key={e.id}>
                <button type="button" onClick={() => onOpen(e.id)} className="md-state md-motion flex w-full items-center gap-3 px-5 py-3.5 text-left">
                  <div className="min-w-0 flex-1">
                    <div className="md-title-small truncate text-on-surface">{e.title}</div>
                    <div className="md-body-small mt-0.5 text-on-surface-variant">
                      {e.attempts} lượt làm · {e.total} báo cáo
                    </div>
                  </div>
                  {e.pending > 0 && <Badge tone="danger">{e.pending} báo cáo chờ</Badge>}
                  <ChevronRight size={18} className="shrink-0 text-on-surface-variant" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function ExamDetail({ id, onBack }: { id: number; onBack: () => void }) {
  const { data, error, loading, reload } = useApi(() => insightsApi.examQuestions(id), [id]);
  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Không có dữ liệu"} onRetry={reload} />;
  const flagged = data.questions.filter((q) => q.suspicious).length;

  return (
    <div className="space-y-6">
      <button type="button" onClick={onBack} className={buttonClass({ variant: "text", size: "sm" })}>
        <ArrowLeft size={16} /> Danh sách đề
      </button>
      <PageHeader
        eyebrow="Chất lượng đề"
        title={data.exam.title}
        description={`Tính từ bài làm mới nhất của ${data.sampleUsers} người. Câu cần ít nhất ${data.minSample} lượt trả lời mới được kết luận.`}
        action={
          <Link to={`/admin/exams/${data.exam.id}`} className={buttonClass()}>
            <Pencil size={16} /> Sửa đề
          </Link>
        }
      />

      {flagged > 0 && (
        <div className="flex items-start gap-3 rounded-m3-md border border-warning bg-warning-container px-4 py-3 text-on-warning-container">
          <AlertTriangle size={20} className="mt-0.5 shrink-0" />
          <p className="md-body-medium">
            <b>{flagged} câu</b> có đa số người chọn khác đáp án hiện tại. Đáp án có thể sai, hãy kiểm tra lại các câu được gắn nhãn bên dưới.
          </p>
        </div>
      )}

      <Card>
        <CardHeader title="Các câu theo mức đáng chú ý" />
        {data.questions.length === 0 ? (
          <Empty title="Đề chưa có câu hỏi" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {data.questions.map((q) => (
              <li key={q.number} className="flex items-start gap-3 px-5 py-4">
                <a href={q.imageUrl} target="_blank" rel="noreferrer" className="hidden h-16 w-24 shrink-0 overflow-hidden rounded-m3-sm border border-outline-variant bg-surface-container-lowest sm:block">
                  <img src={q.imageUrl} alt={`Câu ${q.number}`} loading="lazy" className="h-full w-full object-cover object-top" />
                </a>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="md-title-small text-on-surface">Câu {q.number}</span>
                    <Badge tone="neutral">Đáp án: {q.answer}</Badge>
                    {q.suspicious && <Badge tone="danger">Đáp án có thể sai</Badge>}
                    {q.pendingReports > 0 && <Badge tone="warning">{q.pendingReports} báo cáo chờ</Badge>}
                  </div>
                  <p className="md-body-medium mt-1 text-on-surface-variant">
                    {q.enoughSample ? (
                      <>
                        Sai <b className="text-on-surface">{pct(q.wrongRate)}</b> ({q.wrong}/{q.answered} lượt)
                        {q.topPick && q.suspicious && (
                          <>
                            {" "}
                            · {pct(q.topPickShare)} chọn <b className="text-on-surface">{q.topPick}</b>
                          </>
                        )}
                      </>
                    ) : (
                      <>Mới {q.answered} lượt trả lời, chưa đủ để kết luận.</>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
