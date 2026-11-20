import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Footer } from "@/shared/layout/Footer";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { useApi } from "@/shared/hooks/useApi";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { SubjectSearchInput } from "@/features/subject/SubjectSearchInput";
import { SubjectTile } from "@/features/subject/SubjectTile";
import { flashcardApi } from "./flashcard.api";

// /flashcard: các môn đã có flashcard, bấm một môn để học. Khách xem được.
export default function FlashcardSubjectsPage() {
  const navigate = useNavigate();
  const q = useApi(() => flashcardApi.subjects(), []);
  const [term, setTerm] = useState("");
  const list = useMemo(() => q.data?.items?.map((s) => ({ code: s.code, name: s.name, badge: `${s.cardCount} thẻ` })), [q.data]);
  const t = term.trim().toLowerCase();
  const shown = useMemo(() => (list ?? []).filter((s) => !t || s.code.toLowerCase().includes(t) || (s.name ?? "").toLowerCase().includes(t)), [list, t]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-10">
        <div>
          <p className="md-label-large text-primary">Ôn tập</p>
          <h1 className="md-headline-large mt-1 text-on-surface">Flashcard theo môn</h1>
          <p className="md-body-large mt-2 text-on-surface-variant">Mỗi thẻ là một câu hỏi. Xem câu, nghĩ đáp án rồi bấm hiện đáp án để tự kiểm tra.</p>
        </div>
        <SubjectSearchInput value={term} onChange={setTerm} />
        {q.loading && !list ? (
          <Loading />
        ) : q.error ? (
          <ErrorBox message={q.error} onRetry={q.reload} />
        ) : shown.length === 0 ? (
          <Empty icon={Search} title="Chưa có môn nào khớp">
            Chưa có môn nào có flashcard khớp với từ bạn tìm.
          </Empty>
        ) : (
          <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
            {shown.map((s) => (
              <li key={s.code}>
                <SubjectTile subject={s} onPick={() => navigate(`/flashcard/${s.code.toLowerCase()}`)} />
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </div>
  );
}
