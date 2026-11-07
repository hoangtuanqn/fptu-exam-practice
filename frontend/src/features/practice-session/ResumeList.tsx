import { useState } from "react";
import { Link } from "react-router-dom";
import { Play, Trash2 } from "lucide-react";
import { formatDuration } from "@/features/practice/utils/format";
import { useAuth } from "@/features/auth/AuthContext";
import { errorMessage } from "@/shared/api/errors";
import { useToast } from "@/shared/context/ToastContext";
import { ProgressRing } from "@/shared/ui/ProgressRing";
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

  // Xóa có hoàn tác (thay cho hộp thoại xác nhận): lượt làm biến mất ngay, nhưng chỉ xóa thật ở máy chủ khi hết thời gian hoàn tác.
  // Bấm "Hoàn tác" thì lượt làm hiện lại nguyên vẹn, không gọi máy chủ.
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const setHiding = (id: number, on: boolean) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const items = (data?.items ?? []).filter((s) => !hidden.has(s.id));
  if (!data || items.length === 0) return null;

  const remove = (s: PracticeSession) => {
    setHiding(s.id, true);
    toast.success(`Đã xoá lượt ${MODE_LABEL[s.mode]} của đề "${s.exam.title}"`, {
      action: { label: "Hoàn tác", onClick: () => setHiding(s.id, false) },
      duration: 7000,
      onExpire: () => {
        sessionApi
          .remove(s.id)
          .then(reload)
          .catch((err) => {
            setHiding(s.id, false); // xóa thật thất bại: trả lượt làm về danh sách, đừng để người dùng tưởng đã xóa
            toast.error(errorMessage(err, "Chưa xoá được lượt làm bài, đã đưa lại vào danh sách"));
          });
      },
    });
  };

  return (
    <section className={className}>
      <div className="mb-2.5 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-[17px] font-semibold text-brand-900">Đang làm dở</h2>
      </div>

      <ul className="grid grid-cols-1 gap-2">
        {items.map((s) => {
          const ratio = s.exam.totalQuestions > 0 ? s.answered / s.exam.totalQuestions : 0;
          const pct = Math.round(ratio * 100);
          return (
            <li
              key={s.id}
              className="group flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-surface-container-lowest p-3 shadow-sm transition-all hover:border-brand-300 hover:shadow-md"
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
                className="hidden shrink-0 items-center gap-1.5 rounded-full bg-primary-container px-4 py-1.5 text-xs font-semibold text-on-primary-container shadow-sm transition hover:bg-brand-700 hover:shadow-md sm:inline-flex"
              >
                <Play size={11} fill="currentColor" />
                Làm tiếp
              </Link>
              <button
                type="button"
                onClick={() => remove(s)}
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

    </section>
  );
}
