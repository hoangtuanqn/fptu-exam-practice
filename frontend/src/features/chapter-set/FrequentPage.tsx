import { useEffect } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Crown, Flame, Loader2, Tag } from "lucide-react";
import { useApi } from "@/shared/hooks/useApi";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { Badge } from "@/shared/ui/Badge";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card, CardHeader, PageHeader } from "@/shared/ui/Card";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { SubjectStep } from "./ChapterSetPage";
import { chapterSetApi, type FrequentItem } from "./chapter-set.api";

const RECHECK_MS = 6000;

// Câu hay ra: những câu lặp lại ở nhiều đề của một môn, xếp từ lặp nhiều nhất. Gói thường xem vài câu đầu, Pro xem đủ.
export default function FrequentPage() {
  const [url, setUrl] = useUrlState({ subject: "" });
  const code = url.subject.toUpperCase();
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Học tập" title="Câu hay ra" description="Những câu xuất hiện lặp lại ở nhiều đề của cùng một môn. Ôn trước những câu này là hiệu quả nhất." />
      {code ? <Result code={code} onBack={() => setUrl({ subject: "" })} /> : <SubjectStep title="Chọn môn" onPick={(s) => setUrl({ subject: s.code })} />}
    </div>
  );
}

function Result({ code, onBack }: { code: string; onBack: () => void }) {
  const q = useApi(() => chapterSetApi.frequent(code), [code]);
  const d = q.data;

  // Ảnh được phân tích dần: còn câu chưa phân tích thì hỏi lại để danh sách đầy đủ lên
  useEffect(() => {
    if (!d || d.pending <= 0) return;
    const id = setTimeout(() => q.reload(), RECHECK_MS);
    return () => clearTimeout(id);
  }, [d, q]);

  return (
    <Card>
      <CardHeader
        title={`Môn ${code}`}
        action={
          <Button size="sm" variant="text" onClick={onBack}>
            <ArrowLeft size={15} /> Đổi môn
          </Button>
        }
      />
      {q.loading && !d ? (
        <Loading label="Đang phân tích các đề của môn…" />
      ) : q.error ? (
        <ErrorBox message={q.error} onRetry={q.reload} />
      ) : !d || d.totalExams === 0 ? (
        <Empty icon={Flame} title="Chưa có đề nào của môn này">
          Hệ thống chưa có đề môn {code}. Lấy đề về để bắt đầu.
        </Empty>
      ) : (
        <div className="space-y-4 p-5">
          <p className="md-body-medium text-on-surface-variant">
            Dựa trên <b className="text-on-surface">{d.totalExams}</b> đề của môn {code}: tìm thấy <b className="text-on-surface">{d.repeated}</b> câu xuất hiện từ 2 đề trở lên.
          </p>
          {d.pending > 0 && (
            <p className="flex items-center gap-2 rounded-m3-md bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant" role="status">
              <Loader2 size={16} className="animate-spin" /> Đang phân tích thêm {d.pending} câu, danh sách sẽ đầy đủ dần.
            </p>
          )}
          {d.totalExams < 2 && <p className="md-body-small text-on-surface-variant">Cần ít nhất 2 đề của cùng một môn mới so sánh được.</p>}
          {d.items.length === 0 && d.pending === 0 && d.totalExams >= 2 && <p className="md-body-medium text-on-surface-variant">Chưa thấy câu nào lặp lại giữa các đề hiện có.</p>}

          <ol className="space-y-4">
            {d.items.map((it, i) => (
              <Item key={`${it.examId}-${it.number}`} rank={i + 1} item={it} totalExams={d.totalExams} />
            ))}
          </ol>

          {d.locked && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-m3-md border border-outline-variant bg-surface-container-low px-5 py-4">
              <p className="md-body-medium text-on-surface">
                Còn <b>{d.hidden}</b> câu lặp khác chỉ có ở gói Pro.
              </p>
              <Link to="/pro" className={buttonClass({ variant: "primary" })}>
                <Crown size={16} className="text-[#f0a800]" /> Xem gói Pro
              </Link>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function Item({ rank, item, totalExams }: { rank: number; item: FrequentItem; totalExams: number }) {
  return (
    <li className="overflow-hidden rounded-m3-md border border-outline-variant">
      <div className="flex flex-wrap items-center gap-2 border-b border-outline-variant bg-surface-container-low px-4 py-2.5">
        <span className="md-title-small text-on-surface">#{rank}</span>
        <Badge tone="warning">
          <Flame size={13} /> Ra ở {item.count}/{totalExams} đề
        </Badge>
        <Badge tone="success">Đáp án: {item.answer.join(", ")}</Badge>
        {item.topic && (
          <span className="md-body-small inline-flex min-w-0 items-center gap-1 text-on-surface-variant">
            <Tag size={13} className="shrink-0" /> <span className="truncate">{item.topic}</span>
          </span>
        )}
      </div>
      <a href={item.imageUrl} target="_blank" rel="noreferrer" title="Mở ảnh lớn" className="block bg-surface-container-lowest p-2">
        <img src={item.imageUrl} alt={`Câu hay ra số ${rank}`} loading="lazy" className="mx-auto max-h-72 w-auto max-w-full object-contain object-top" />
      </a>
      {item.conflict && (
        <p className="md-body-small flex items-start gap-2 bg-warning-container px-4 py-2 text-on-warning-container">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> Các đề đang ghi đáp án khác nhau cho câu này. Hãy kiểm tra lại, và báo cáo nếu thấy sai.
        </p>
      )}
      <div className="md-body-small px-4 py-2 text-on-surface-variant">
        Lấy từ {item.examTitle} · câu {item.number}
      </div>
    </li>
  );
}
