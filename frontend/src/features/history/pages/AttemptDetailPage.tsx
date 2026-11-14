import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { historyApi } from "@/features/history/history.api";
import { QuestionResultGrid } from "@/features/history/components/QuestionResultGrid";
import { MAX_SCORE, PASS_SCORE } from "@/features/practice/config/scoring";
import { getModeConfig } from "@/features/practice/config/modes";
import { ViolationSummary } from "@/features/practice/components/ViolationSummary";
import { formatDuration, formatScore } from "@/features/practice/utils/format";
import { useApi } from "@/shared/hooks/useApi";
import { Badge } from "@/shared/ui/Badge";
import { buttonClass } from "@/shared/ui/Button";
import { Card, CardHeader } from "@/shared/ui/Card";
import { ErrorBox, Loading } from "@/shared/ui/Feedback";
import { ScoreRing } from "@/shared/ui/ScoreRing";
import { formatDateTime } from "@/shared/utils/formatters";

type Filter = "all" | "wrong" | "skipped";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Tất cả" },
  { id: "wrong", label: "Câu sai" },
  { id: "skipped", label: "Chưa làm" },
];

export default function AttemptDetailPage() {
  const id = Number(useParams().id);
  const { data, error, loading, reload } = useApi(() => historyApi.get(id), [id]);
  const [filter, setFilter] = useState<Filter>("all");

  if (loading && !data) return <Loading />;
  if (error || !data) return <ErrorBox message={error ?? "Không tải được bài làm"} onRetry={reload} />;

  const passed = data.score >= PASS_SCORE;
  const { label: modeLabel } = getModeConfig(data.mode === "EXAM" ? "exam" : "practice");
  const shown = data.details.filter((q) => filter === "all" || q.outcome === filter);

  return (
    <>
      <Link to="/account/attempts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft size={15} /> Lịch sử làm bài
      </Link>

      <Card className="mb-6 p-6">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <ScoreRing value={data.score / MAX_SCORE} tone={data.totalGraded === 0 ? "neutral" : passed ? "success" : "danger"}>
            <span className="font-serif text-4xl font-semibold leading-none text-slate-900">{formatScore(data.score)}</span>
            <span className="mt-1 text-xs text-slate-400">/ {MAX_SCORE}</span>
          </ScoreRing>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h1 className="font-serif text-xl font-semibold text-slate-900">{data.exam.title}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {modeLabel} · nộp lúc {formatDateTime(data.createdAt)} · làm trong {formatDuration(data.durationSec)}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
              {data.totalGraded > 0 && <Badge tone={passed ? "success" : "danger"}>{passed ? "Đạt" : "Chưa đạt"}</Badge>}
              <Badge tone="success">Đúng {data.correct}</Badge>
              <Badge tone="danger">Sai {data.wrong}</Badge>
              <Badge>Chưa làm {data.skipped}</Badge>
            </div>
          </div>

          <Link to={`/exam/${data.exam.threadId}`} className={buttonClass({ variant: "primary" })}>
            <RotateCcw size={16} /> Làm lại đề
          </Link>
        </div>
        {data.mode === "EXAM" && data.violations && data.violations.length > 0 && <ViolationSummary violations={data.violations} className="mt-5" />}
      </Card>

      <Card>
        <CardHeader
          title="Chi tiết từng câu"
          description="Đáp án đúng là đáp án tại thời điểm chấm bài."
          action={
            <div role="tablist" className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  role="tab"
                  aria-selected={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition ${
                    filter === f.id ? "bg-surface-container-lowest text-brand-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          }
        />
        <QuestionResultGrid items={shown} />
      </Card>
    </>
  );
}
