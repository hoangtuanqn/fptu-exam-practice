import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Footer } from "@/shared/layout/Footer";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { useApi } from "@/shared/hooks/useApi";
import { SubjectPicker } from "@/features/subject/SubjectPicker";
import { flashcardApi } from "./flashcard.api";

// /flashcard: các môn đã có flashcard, bấm một môn để học. Khách xem được.
export default function FlashcardSubjectsPage() {
  const navigate = useNavigate();
  const q = useApi(() => flashcardApi.subjects(), []);
  const list = useMemo(() => q.data?.items?.map((s) => ({ code: s.code, name: s.name, badge: `${s.cardCount} thẻ` })), [q.data]);

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10">
        <div>
          <p className="md-label-large text-primary">Ôn tập</p>
          <h1 className="md-headline-large mt-1 text-on-surface">Flashcard theo môn</h1>
          <p className="md-body-large mt-2 text-on-surface-variant">Mỗi thẻ là một câu hỏi. Xem câu, nghĩ đáp án rồi bấm hiện đáp án để tự kiểm tra.</p>
        </div>
        <SubjectPicker
          subjects={list}
          loading={q.loading}
          error={q.error}
          onRetry={q.reload}
          onPick={(code) => navigate(`/flashcard/${code.toLowerCase()}`)}
          emptyHint="Chưa có môn nào có flashcard khớp với từ bạn tìm."
        />
      </main>
      <Footer />
    </div>
  );
}
