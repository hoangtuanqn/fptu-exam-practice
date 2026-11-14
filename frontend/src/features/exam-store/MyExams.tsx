import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import type { ImportedExam } from "@/features/exam-import/types";
import { ResumeList } from "@/features/practice-session/ResumeList";
import { formatScore } from "@/features/practice/utils/format";
import { useAuth } from "@/features/auth/AuthContext";
import { ProgressRing } from "@/shared/ui/ProgressRing";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { examLibraryApi, sizeText } from "./exam-library.api";
import { useOnLibraryChanged } from "./libraryEvents";

const SHOWN = 6;

interface Props {
  onOpen: (exam: ImportedExam) => void;
}

// "Đề của tôi": các đề đã nhập, bấm vào là mở để làm. Điểm cao nhất lấy từ lịch sử làm bài.
export function MyExams({ onOpen }: Props) {
  const toast = useToast();
  const { user } = useAuth();
  const { data, reload } = useApi(() => examLibraryApi.list(1, SHOWN), [user?.id]);
  useOnLibraryChanged(reload);
  const [openingId, setOpeningId] = useState<number | null>(null);

  if (!data || data.items.length === 0) return null; // chưa có đề thì không chiếm chỗ

  async function open(id: number) {
    setOpeningId(id);
    try {
      onOpen(await examImportApi.exam(id));
    } catch {
      toast.error("Không mở được đề này");
    } finally {
      setOpeningId(null);
    }
  }

  return (
    <>
      <ResumeList limit={3} className="mt-10 text-left" />
      <section className="mt-8 text-left">
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <h2 className="font-display text-[17px] font-semibold text-brand-900">
            {user ? "Đề của tôi" : "Đề bạn đã lấy"}
          </h2>
          {user ? (
            <Link to="/account/exams" className="text-xs font-medium text-brand-700 hover:underline">
              {data.meta.total > data.items.length ? `Xem tất cả ${data.meta.total} đề` : "Kho đề của tôi"}
            </Link>
          ) : (
            <Link to="/register" className="text-xs font-medium text-brand-700 hover:underline">
              Đăng ký để lưu lịch sử
            </Link>
          )}
        </div>

        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {data.items.map((e) => {
            const score = e.bestScore ?? 0;
            const tone =
              score >= 8 ? "text-emerald-600" : score >= 5 ? "text-amber-500" : "text-rose-500";
            const hasDone = e.attempts > 0;
            return (
              <li key={e.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => void open(e.id)}
                  disabled={openingId !== null}
                  className="group flex w-full min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-surface-container-lowest p-3 text-left shadow-sm transition-all hover:border-brand-300 hover:shadow-md disabled:opacity-60"
                >
                  {openingId === e.id ? (
                    <span className="flex h-[48px] w-[48px] shrink-0 items-center justify-center">
                      <Loader2 size={20} className="animate-spin text-brand-700" />
                    </span>
                  ) : hasDone ? (
                    <ProgressRing value={score / 10} label={formatScore(score)} size={48} color={tone} />
                  ) : (
                    <span className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold uppercase text-slate-400">
                      mới
                    </span>
                  )}

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900 transition-colors group-hover:text-brand-700">
                      {e.title}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-slate-500">
                      {e.answerSource === "PENDING" && (
                        <span className="font-medium text-brand-700">Đang chuẩn bị đáp án · </span>
                      )}
                      {(e.answerSource === "FAILED" || e.answerSource === "DEFAULT") && (
                        <span className="font-medium text-amber-700">Chưa có đáp án · </span>
                      )}
                      {sizeText(e)} · {hasDone ? `${e.attempts} lần làm, cao nhất ${formatScore(score)}` : "chưa làm"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
