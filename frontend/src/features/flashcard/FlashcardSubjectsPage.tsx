import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info, Layers } from "lucide-react";
import { Footer } from "@/shared/layout/Footer";
import { SiteHeader } from "@/shared/layout/SiteHeader";
import { useApi } from "@/shared/hooks/useApi";
import { Button } from "@/shared/ui/Button";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Segmented } from "@/shared/ui/Segmented";
import { SubjectSearchInput } from "@/features/subject/SubjectSearchInput";
import { SubjectTile } from "@/features/subject/SubjectTile";
import { useSubjectSearch } from "@/features/subject/useSubjectSearch";
import { useSlow } from "@/shared/hooks/useSlow";
import { flashcardApi } from "./flashcard.api";

const STEP = 24; // mỗi lần hiện thêm bấy nhiêu môn
type Sort = "most" | "az";

// /flashcard: cùng bố cục với Kho đề (tiêu đề, ô tìm, lưới môn) nhưng không có lọc theo kỳ. Khách xem được.
export default function FlashcardSubjectsPage() {
  const navigate = useNavigate();
  const q = useApi(() => flashcardApi.subjects(), []);
  const [term, setTerm] = useState("");
  const [sort, setSort] = useState<Sort>("most");
  const [limit, setLimit] = useState(STEP);

  const all = q.data?.items;
  const { results, term: searched, stale } = useSubjectSearch(all, term);
  const slow = useSlow(stale);
  useEffect(() => setLimit(STEP), [searched, sort]); // đổi tìm kiếm hay cách sắp thì về đợt đầu
  const list = useMemo(
    () =>
      [...results].sort((a, b) =>
        sort === "az"
          ? a.code.localeCompare(b.code)
          : b.cardCount - a.cardCount || a.code.localeCompare(b.code),
      ),
    [results, sort],
  );
  const shown = useMemo(() => list.slice(0, limit), [list, limit]);
  const rest = list.length - shown.length;
  // memo: lúc đang gõ, lưới ô môn chưa đổi thì không vẽ lại
  const grid = useMemo(
    () => (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((s) => (
          <li key={s.code}>
            <SubjectTile
              subject={{
                code: s.code,
                name: s.name,
                badge: `${s.cardCount} thẻ`,
              }}
              onPick={() => navigate(`/flashcard/${s.code.toLowerCase()}`)}
            />
          </li>
        ))}
      </ul>
    ),
    [shown, navigate],
  );

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <SiteHeader />
      <main className="flex-1">
        <section className="relative isolate border-b border-outline-variant">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
          >
            <div className="absolute left-1/2 top-[-7rem] h-64 w-[44rem] max-w-full -translate-x-1/2 rounded-full bg-[#ffc61f]/20 blur-3xl" />
            <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(var(--md-sys-color-outline-variant)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_0%,#000_25%,transparent_100%)]" />
          </div>
          <div className="mx-auto w-full max-w-5xl px-4 pb-8 pt-10 text-center sm:pt-12">
            <p className="md-label-large uppercase tracking-[0.2em] text-primary">
              Flashcard
            </p>
            <h1 className="md-hero-title mt-2 text-on-surface">
              Flashcard <span className="italic text-primary">FE</span> của từng
              môn
            </h1>
            <p className="md-body-large mx-auto mt-3 max-w-xl text-on-surface-variant">
              Flashcard do FEPass tổng hợp để mọi người cùng luyện tập và tham
              khảo. Đáp án chỉ để tham khảo, bạn nên đối chiếu thêm với tài liệu
              môn học.
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-8">
          <SubjectSearchInput value={term} onChange={setTerm} busy={stale} />

          {q.loading && !all ? (
            <Loading />
          ) : q.error ? (
            <ErrorBox message={q.error} onRetry={q.reload} />
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p
                  className="md-body-medium text-on-surface-variant"
                  aria-live="polite"
                >
                  {searched
                    ? `Tìm thấy ${list.length}/${all?.length ?? 0} môn`
                    : `Hiển thị ${shown.length}/${list.length} môn`}
                </p>
                <Segmented
                  label="Sắp xếp môn"
                  value={sort}
                  options={[
                    { value: "most", label: "Nhiều thẻ nhất" },
                    { value: "az", label: "Theo mã A-Z" },
                  ]}
                  onChange={setSort}
                />
              </div>

              {list.length === 0 ? (
                <Empty icon={Layers} title="Chưa có môn nào khớp">
                  Thử mã môn khác.
                </Empty>
              ) : (
                <div aria-busy={slow} className={`transition-opacity ${slow ? "opacity-60" : ""}`}>{grid}</div>
              )}

              {rest > 0 && (
                <div className="flex justify-center">
                  <Button
                    variant="tonal"
                    onClick={() => setLimit((n) => n + STEP)}
                  >
                    Xem thêm {Math.min(STEP, rest)} môn
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
