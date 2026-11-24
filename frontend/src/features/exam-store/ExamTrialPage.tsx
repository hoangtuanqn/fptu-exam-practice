import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileSearch, Loader2, Lock, Unlock } from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { examApi } from "@/features/exam/exam.api";
import { examOpenPath } from "@/features/exam/types";
import { ApiError } from "@/shared/api/client";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { Button, buttonClass } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Empty } from "@/shared/ui/Feedback";
import { ProtectedImg } from "@/shared/ui/ProtectedImg";
import { QueryBoundary } from "@/shared/ui/QueryBoundary";
import { formatCredit } from "@/shared/utils/formatters";
import { isUuid } from "@/shared/utils/uuid";
import { catalogApi, type ExamTrial } from "./catalog.api";
import { ConfirmOpenDialog } from "./ConfirmOpenDialog";
import { ExamKindBadge } from "./ExamKindBadge";

const TILE = "relative block aspect-[4/3] overflow-hidden rounded-m3-md bg-surface-container-lowest shadow-m3-1";
const MAX_LOCK_TILES = 6; // chỉ minh hoạ vài ô khoá, số câu còn lại ghi bằng chữ

// Xem thử một đề chưa mở khoá (/exam/:examId/trial): 3 câu đầu xem được, các câu còn lại khoá cho đến khi trả phí mở đề
export default function ExamTrialPage() {
  const examId = useParams().examId ?? "";
  const subject = useSearchParams()[0].get("subject") ?? undefined;
  const valid = isUuid(examId);
  const navigate = useNavigate();
  const query = useApi(async () => {
    if (!valid) return null;
    try {
      const [trial, quote] = await Promise.all([catalogApi.trial(examId), examApi.quote(examId, subject)]);
      return { trial, quote };
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) return null;
      throw err;
    }
  }, [examId, valid]);
  const owned = query.data?.quote.reason === "owned";
  const trial = query.data?.trial;
  // Đề đã có trong kho thì không cần xem thử: vào thẳng đề
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
              <Trial trial={res.trial} fee={res.quote.fee} subject={subject} />
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

function Trial({ trial, fee, subject }: { trial: ExamTrial; fee: number; subject?: string }) {
  const navigate = useNavigate();
  const toast = useToast();
  const { user, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const back = `/kho-de?subject=${encodeURIComponent(subject ?? trial.subjectCode ?? "")}`;

  async function open() {
    setBusy(true);
    try {
      await examApi.unlock(trial.examId, subject);
      void refresh(); // số dư vừa đổi
      navigate(examOpenPath({ id: trial.examId, kind: trial.kind, totalQuestions: trial.totalQuestions }), { replace: true });
    } catch (err) {
      toast.error(errorMessage(err, "Chưa mở được đề này"));
      setBusy(false);
    }
  }

  return (
    <>
      <Link to={back} className={`${buttonClass({ size: "sm", variant: "text" })} mb-3`}>
        <ArrowLeft size={15} /> Quay lại danh sách
      </Link>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ExamKindBadge kind={trial.kind} />
            <h1 className="md-headline-small break-words text-on-surface">{trial.title}</h1>
          </div>
          <p className="md-body-medium mt-1 text-on-surface-variant">
            Xem thử {trial.questions.length} câu đầu{trial.locked > 0 ? `, còn ${trial.locked} câu khoá` : ""}. Mở đề để xem đủ, luyện tập và thi thử.
          </p>
        </div>
        <Button variant="primary" disabled={busy} onClick={() => (fee > 0 ? setConfirming(true) : void open())}>
          {busy ? <Loader2 size={16} className="animate-spin" /> : <Unlock size={16} />}
          {fee > 0 ? `Mở khoá cả đề · ${formatCredit(fee)}` : "Mở đề"}
        </Button>
      </div>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {trial.questions.map((q) => (
          <li key={q.number}>
            <div className={TILE}>
              <ProtectedImg src={q.imageUrl} alt={`Câu ${q.number}`} className="h-full w-full object-cover object-top" />
              <span className="md-label-large absolute inset-x-0 bottom-0 bg-inverse-surface/70 px-3 py-2 text-inverse-on-surface">Câu {q.number}</span>
            </div>
          </li>
        ))}
        {Array.from({ length: Math.min(trial.locked, MAX_LOCK_TILES) }, (_, i) => (
          <li key={`lock-${i}`}>
            <div className={`${TILE} flex flex-col items-center justify-center gap-2 bg-surface-container text-on-surface-variant`}>
              <Lock size={26} aria-hidden />
              <span className="md-label-large">Câu {trial.questions.length + i + 1}</span>
            </div>
          </li>
        ))}
      </ul>
      {trial.locked > MAX_LOCK_TILES && <p className="md-body-medium mt-3 text-center text-on-surface-variant">và {trial.locked - MAX_LOCK_TILES} câu khoá khác</p>}

      {confirming && user && (
        <ConfirmOpenDialog
          fee={fee}
          balance={user.balance}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            void open();
          }}
        />
      )}
    </>
  );
}
