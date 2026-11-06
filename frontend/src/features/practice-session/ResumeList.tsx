import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Play, Trash2 } from "lucide-react";
import { formatDuration } from "@/features/practice/utils/format";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/shared/context/ToastContext";
import { Button } from "@/shared/ui/Button";
import { ProgressRing } from "@/shared/ui/ProgressRing";
import { Modal, ModalActions, ModalTitle } from "@/shared/ui/Modal";
import { useApi } from "@/shared/hooks/useApi";
import { formatDateTime } from "@/shared/utils/formatters";
import { sessionApi, sessionPath, type PracticeSession } from "./session.api";

interface Props {
  limit?: number;
  className?: string;
}

const MODE_LABEL = { PRACTICE: "Luyện tập", EXAM: "Thi thử" } as const;

// Các lượt làm dở dang: bấm để làm tiếp đúng chỗ đã dừng. Không có lượt nào thì không chiếm chỗ.
export function ResumeList({ limit = 5, className = "" }: Props) {
  const toast = useToast();
  const { user } = useAuth();
  const { data, reload } = useApi(() => sessionApi.listInProgress(1, limit), [user?.id, limit]);

  const [target, setTarget] = useState<PracticeSession | null>(null); // lượt đang chờ xác nhận xoá
  const [deleting, setDeleting] = useState(false);

  if (!data || data.items.length === 0) return null;

  const confirmRemove = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      await sessionApi.remove(target.id);
      toast.success("Đã xoá lượt làm bài");
      setTarget(null);
      reload();
    } catch {
      toast.error("Không xoá được lượt làm bài");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <section className={className}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[17px] font-semibold text-brand-900">Đang làm dở</h2>
      </div>

      <ul className="grid grid-cols-1 gap-2">
        {data.items.map((s) => {
          const ratio = s.exam.totalQuestions > 0 ? s.answered / s.exam.totalQuestions : 0;
          const pct = Math.round(ratio * 100);
          return (
            <li
              key={s.id}
              className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
            >
              <ProgressRing value={ratio} label={`${pct}%`} size={52} />

              <Link to={sessionPath(s)} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-brand-700">
                  {s.exam.title}
                </span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[11px] font-semibold ${
                      s.mode === "EXAM"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-brand-100 text-brand-800"
                    }`}
                  >
                    {MODE_LABEL[s.mode]}
                  </span>
                  <span>
                    {s.answered}/{s.exam.totalQuestions} câu · {formatDuration(s.elapsedSec)}
                  </span>
                  <span className="hidden text-slate-400 sm:inline">· {formatDateTime(s.updatedAt)}</span>
                </span>
                {/* Progress bar */}
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </Link>

              <Link
                to={sessionPath(s)}
                className="hidden shrink-0 items-center gap-1.5 rounded-full bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-700 hover:shadow-md sm:inline-flex"
              >
                <Play size={11} fill="currentColor" />
                Làm tiếp
              </Link>
              <button
                type="button"
                onClick={() => setTarget(s)}
                title="Xoá lượt làm này"
                aria-label="Xoá lượt làm này"
                className="shrink-0 rounded-lg p-2 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500"
              >
                <Trash2 size={15} />
              </button>
            </li>
          );
        })}
      </ul>

      {target && (
        <Modal onClose={deleting ? undefined : () => setTarget(null)}>
          <ModalTitle icon={Trash2}>Xoá lượt làm bài?</ModalTitle>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Bạn đang xoá lượt <b className="text-slate-900">{MODE_LABEL[target.mode]}</b> của đề{" "}
            <b className="text-slate-900">{target.exam.title}</b>, đã làm {target.answered}/
            {target.exam.totalQuestions} câu ({formatDuration(target.elapsedSec)}).
          </p>
          <p className="mt-2 text-sm font-medium text-rose-600">
            Đáp án đã chọn và thời gian đã làm sẽ mất, không khôi phục được. Đề vẫn còn trong kho.
          </p>
          <ModalActions>
            <Button onClick={() => setTarget(null)} disabled={deleting}>
              Giữ lại
            </Button>
            <Button variant="danger" onClick={() => void confirmRemove()} disabled={deleting}>
              {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
              Xoá lượt này
            </Button>
          </ModalActions>
        </Modal>
      )}
    </section>
  );
}
