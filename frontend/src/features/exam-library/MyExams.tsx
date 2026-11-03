import { useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Loader2 } from "lucide-react";
import { examImportApi } from "@/features/exam-import/exam-import.api";
import type { ImportedExam } from "@/features/exam-import/types";
import { formatScore } from "@/features/practice/utils/format";
import { useToast } from "@/shared/context/ToastContext";
import { useApi } from "@/shared/hooks/useApi";
import { examLibraryApi } from "./exam-library.api";

const SHOWN = 6;

interface Props {
  onOpen: (exam: ImportedExam) => void;
}

// "Đề của tôi": các đề đã nhập, bấm vào là mở để làm. Điểm cao nhất lấy từ lịch sử làm bài.
export function MyExams({ onOpen }: Props) {
  const toast = useToast();
  const { data } = useApi(() => examLibraryApi.list(1, SHOWN), []);
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
    <section className="mt-10 text-left">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Đề của tôi</h2>
        <Link to="/account/attempts" className="text-xs font-medium text-brand-700 hover:underline">
          Lịch sử làm bài
        </Link>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {data.items.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => void open(e.id)}
              disabled={openingId !== null}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 text-left shadow-soft transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-card disabled:opacity-60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                {openingId === e.id ? <Loader2 size={16} className="animate-spin" /> : <BookOpen size={16} />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{e.title}</span>
                <span className="block text-xs text-slate-500">
                  {e.totalQuestions} câu · {e.attempts > 0 ? `${e.attempts} lần làm, cao nhất ${formatScore(e.bestScore ?? 0)}` : "chưa làm"}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
