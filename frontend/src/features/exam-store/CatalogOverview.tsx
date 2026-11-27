import { useEffect, useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { SubjectSearchInput } from "@/features/subject/SubjectSearchInput";
import { SubjectTile } from "@/features/subject/SubjectTile";
import { useSubjectSearch } from "@/features/subject/useSubjectSearch";
import { Button } from "@/shared/ui/Button";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { SkeletonList } from "@/shared/ui/Skeleton";
import { Segmented } from "@/shared/ui/Segmented";
import { useSlow } from "@/shared/hooks/useSlow";
import type { LibraryOverview } from "./catalog.api";
import type { SubjectsQuery } from "./PublicSubjectBrowser";

const STEP = 24; // mỗi lần hiện thêm bấy nhiêu môn

type Sort = "most" | "az";

// Toàn bộ môn của Kho đề công khai: tìm theo mã hoặc tên, sắp theo số đề hay theo mã, hiện từng đợt (không cắt bớt, luôn nói rõ đang hiện bao nhiêu trên tổng).
export function CatalogOverview({ subjects, overview, onPick }: { subjects: SubjectsQuery; overview?: LibraryOverview | null; onPick: (code: string) => void }) {
  const [q, setQ] = useState("");
  const [url, setUrl] = useUrlState({ ky: "" }); // ?ky=3 là Kỳ 3, ?ky=none là chưa phân loại, bỏ trống là tất cả
  const semester = url.ky === "none" ? "none" : /^[0-9]$/.test(url.ky) ? Number(url.ky) : null;
  const [sort, setSort] = useState<Sort>("most");
  const [limit, setLimit] = useState(STEP);

  const all = subjects.data;
  const { results, term, stale } = useSubjectSearch(all, q);
  useEffect(() => setLimit(STEP), [term, sort, url.ky]); // đổi tìm kiếm hay cách sắp thì về đợt đầu
  const list = useMemo(() => {
    const hit = term ? new Set(results) : null; // lọc theo từ khoá nhưng giữ thứ tự đang chọn của trang
    const found = (all ?? []).filter((s) => (semester === null || (semester === "none" ? s.semester === null : s.semester === semester)) && (!hit || hit.has(s)));
    return sort === "az" ? found.sort((a, b) => a.code.localeCompare(b.code)) : found; // dữ liệu từ máy chủ đã xếp theo số đề
  }, [all, results, term, sort, semester]);
  const shown = useMemo(() => list.slice(0, limit), [list, limit]);
  // memo: lúc đang gõ, lưới ô môn chưa đổi thì không vẽ lại
  const grid = useMemo(
    () => (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((s) => (
          <li key={s.code}>
            <SubjectTile subject={{ code: s.code, name: s.name, badge: `${s.total} đề` }} onPick={() => onPick(s.code)} />
          </li>
        ))}
      </ul>
    ),
    [shown, onPick],
  );
  const slow = useSlow(stale);

  if (subjects.loading && !all)
    return (
      <div className="space-y-5">
        <SubjectSearchInput value={q} onChange={setQ} />
        <SkeletonList rows={6} />
      </div>
    );
  if (subjects.error) return <ErrorBox message={subjects.error} onRetry={subjects.reload} />;

  const rest = list.length - shown.length;

  return (
    <div className="space-y-5">
      <SubjectSearchInput value={q} onChange={setQ} busy={stale} />
      <SemesterTabs overview={overview} value={url.ky} onChange={(ky) => setUrl({ ky })} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="md-body-medium text-on-surface-variant" aria-live="polite">
          {term ? `Tìm thấy ${list.length}/${all?.length ?? 0} môn` : `Hiển thị ${shown.length}/${list.length} môn`}
        </p>
        <Segmented
          label="Sắp xếp môn"
          value={sort}
          options={[
            { value: "most", label: "Nhiều đề nhất" },
            { value: "az", label: "Theo mã A-Z" },
          ]}
          onChange={setSort}
        />
      </div>

      {list.length === 0 ? (
        <Empty icon={BookOpen} title="Chưa có môn nào khớp">
          Thử mã môn khác.
        </Empty>
      ) : (
        <div aria-busy={slow} className={`transition-opacity ${slow ? "opacity-60" : ""}`}>{grid}</div>
      )}

      {rest > 0 && (
        <div className="flex justify-center">
          <Button variant="tonal" onClick={() => setLimit((n) => n + STEP)}>
            Xem thêm {Math.min(STEP, rest)} môn
          </Button>
        </div>
      )}
    </div>
  );
}

// Lọc môn theo kỳ học: Tất cả, Kỳ 0 đến Kỳ 9, Chưa phân loại . Kỳ chưa có môn thì mờ đi.
function SemesterTabs({ overview, value, onChange }: { overview?: LibraryOverview | null; value: string; onChange: (ky: string) => void }) {
  if (!overview) return null;
  const items = [
    { key: "", label: "Tất cả", count: overview.subjects },
    ...overview.bySemester.map((b) => ({ key: b.semester === null ? "none" : String(b.semester), label: b.semester === null ? "Chưa phân loại" : `Kỳ ${b.semester}`, count: b.subjects })),
  ];
  return (
    <div role="tablist" aria-label="Lọc môn theo kỳ" className="-mx-4 flex gap-x-1.5 gap-y-3 overflow-x-auto px-4 py-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0">
      {items.map((i) => {
        const on = value === i.key;
        return (
          <button
            key={i.key || "all"}
            type="button"
            role="tab"
            aria-selected={on}
            disabled={i.count === 0 && !on}
            onClick={() => onChange(i.key)}
            className="site-chip md-state md-label-medium disabled:opacity-40"
          >
            {i.label}
          </button>
        );
      })}
    </div>
  );
}
