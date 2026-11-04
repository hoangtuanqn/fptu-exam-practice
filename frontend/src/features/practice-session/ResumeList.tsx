import { Link } from "react-router-dom";
import { PlayCircle, Trash2 } from "lucide-react";
import { formatDuration } from "@/features/practice/utils/format";
import { useAuth } from "@/features/auth/AuthContext";
import { useToast } from "@/shared/context/ToastContext";
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

  if (!data || data.items.length === 0) return null;

  const remove = async (s: PracticeSession) => {
    try {
      await sessionApi.remove(s.id);
      reload();
    } catch {
      toast.error("Không xoá được lượt làm bài");
    }
  };

  return (
    <section className={className}>
      <h2 className="mb-2 text-base font-semibold text-slate-900">Đang làm dở</h2>
      <ul className="grid grid-cols-1 gap-2">
        {data.items.map((s) => (
          <li key={s.id} className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200/80 bg-white pr-2 shadow-soft transition hover:border-brand-300">
            <Link to={sessionPath(s)} className="flex min-w-0 flex-1 items-center gap-3 px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <PlayCircle size={18} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{s.exam.title}</span>
                <span className="block truncate text-xs text-slate-500">
                  {MODE_LABEL[s.mode]} · đã làm {s.answered}/{s.exam.totalQuestions} câu · {formatDuration(s.elapsedSec)} · {formatDateTime(s.updatedAt)}
                </span>
              </span>
              <span className="shrink-0 text-xs font-medium text-brand-700">Làm tiếp</span>
            </Link>
            <button
              type="button"
              onClick={() => void remove(s)}
              title="Xoá lượt làm này"
              aria-label="Xoá lượt làm này"
              className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
