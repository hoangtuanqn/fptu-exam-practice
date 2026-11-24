import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { ArrowLeft, Crown, FileSearch, Loader2, Lock, Unlock } from "lucide-react";
import { examApi } from "@/features/exam/exam.api";
import { examOpenPath } from "@/features/exam/types";
import { ApiError } from "@/shared/api/client";
import { useApi } from "@/shared/hooks/useApi";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { formatCredit } from "@/shared/utils/formatters";
import { isPro } from "@/shared/utils/pro";
import { isUuid } from "@/shared/utils/uuid";
import { catalogApi, type ExamTrial } from "./catalog.api";
import { ExamKindBadge } from "./ExamKindBadge";
import { useUnlockExam } from "./useUnlockExam";

const LOCK_TILES = 6; // chỉ minh hoạ vài ô khoá, tổng số câu ghi bằng chữ

// Đề chưa mở khoá mà không làm thử được trên web (PE, Quiz, đề chỉ có tệp...): khoá ngay từ đầu, mua đề hoặc nâng cấp Pro để xem
export default function ExamTrialPage() {
  const examId = useParams().examId ?? "";
  const valid = isUuid(examId);
  const navigate = useNavigate();
  const query = useApi(async () => {
    if (!valid) return null;
    try {
      const [trial, quote] = await Promise.all([catalogApi.trial(examId), examApi.quote(examId)]);
      return { trial, quote };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }, [examId, valid]);
  const owned = !!query.data?.quote.title; // title chỉ có khi đề đã trong kho của bạn (reason có thể là "pro" dù chưa sở hữu)
  const trial = query.data?.trial;
  // Đề đã có trong kho thì không cần khoá: vào thẳng đề
  useEffect(() => {
    if (owned && trial) navigate(examOpenPath({ id: trial.examId, kind: trial.kind, totalQuestions: trial.totalQuestions }), { replace: true });
  }, [owned, trial, navigate]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6">
        <QueryBoundary query={query} loadingLabel="Đang mở đề…">
          {(res) =>
            res ? (
              <Locked trial={res.trial} fee={res.quote.fee} />
            ) : (
              <Card>
                <Empty icon={FileSearch} title="Không tìm thấy đề này">
                  <Link to="/kho-de" className={`${buttonClass({ size: "sm" })} mt-3`}>
                    Về Kho đề
                  </Link>
                </Empty>
              </Card>
            )
          }
        </QueryBoundary>
      </main>
    </div>
  );
}

function Locked({ trial, fee }: { trial: ExamTrial; fee: number }) {
  const navigate = useNavigate();
  const { start, busy, dialog } = useUnlockExam(trial.examId, () => navigate(`/exam/${trial.examId}/preview`, { replace: true }));
  const { user } = useAuth();
  const back = `/kho-de?subject=${encodeURIComponent(trial.subjectCode ?? "")}`;

  return (
    <>
      <Link to={back} className={`${buttonClass({ size: "sm", variant: "text" })} mb-3`}>
        <ArrowLeft size={15} /> Quay lại danh sách
      </Link>
      <div className="mb-5 flex items-center gap-2">
        <ExamKindBadge kind={trial.kind} />
        <h1 className="md-headline-small break-words text-on-surface">{trial.title}</h1>
      </div>

      <Card>
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <Lock size={26} aria-hidden />
          </span>
          <p className="md-title-medium text-on-surface">Đề này đang khoá{trial.locked > 0 ? ` (${trial.locked} câu)` : ""}</p>
          <p className="md-body-medium max-w-md text-on-surface-variant">Mở khoá để xem toàn bộ đề, hoặc dùng gói Pro để mở mọi đề mà không tốn credit từng đề.</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
            <Button variant="primary" disabled={busy} onClick={start}>
              {busy ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
              {fee > 0 ? `Mua đề này · ${formatCredit(fee)}` : "Mở đề"}
            </Button>
            {!isPro(user) && (
              <Link to="/pro" className={buttonClass({ variant: "tonal" })}>
                <Crown size={16} /> Nâng cấp Pro
              </Link>
            )}
          </div>
        </div>
      </Card>

      {trial.locked > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6" aria-hidden>
          {Array.from({ length: Math.min(trial.locked, LOCK_TILES) }, (_, i) => (
            <li key={i} className="flex aspect-[4/3] items-center justify-center rounded-m3-md bg-surface-container text-on-surface-variant">
              <Lock size={22} />
            </li>
          ))}
        </ul>
      )}
      {dialog}
    </>
  );
}
