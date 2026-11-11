import { useEffect, useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { useUrlState } from "@/shared/hooks/useUrlState";
import { SubjectSearchInput } from "@/features/subject/SubjectSearchInput";
import { SubjectTile } from "@/features/subject/SubjectTile";
import { Button } from "@/shared/ui/Button";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Segmented } from "@/shared/ui/Segmented";
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
  useEffect(() => setLimit(STEP), [q, sort, url.ky]); // đổi tìm kiếm hay cách sắp thì về đợt đầu

  const all = subjects.data;
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const found = (all ?? []).filter(
      (s) =>
        (semester === null || (semester === "none" ? s.semester === null : s.semester === semester)) &&
        (!term || s.code.toLowerCase().includes(term) || (s.name ?? "").toLowerCase().includes(term)),
    );
    return sort === "az" ? [...found].sort((a, b) => a.code.localeCompare(b.code)) : found; // dữ liệu từ máy chủ đã xếp theo số đề
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, q, sort, url.ky]);

  if (subjects.loading && !all) return <Loading />;
  if (subjects.error) return <ErrorBox message={subjects.error} onRetry={subjects.reload} />;

  const shown = list.slice(0, limit);
  const rest = list.length - shown.length;

  return (
    <div className="space-y-5">
      <SubjectSearchInput value={q} onChange={setQ} />
      <SemesterTabs overview={overview} value={url.ky} onChange={(ky) => setUrl({ ky })} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="md-body-medium text-on-surface-variant" aria-live="polite">
          {q.trim() ? `Tìm thấy ${list.length}/${all?.length ?? 0} môn` : `Hiển thị ${shown.length}/${list.length} môn`}
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
          Thử mã môn khác, hoặc dán link FuOverflow ở trang chủ để lấy đề mới.
        </Empty>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {shown.map((s) => (
            <li key={s.code}>
              <SubjectTile subject={{ code: s.code, name: s.name, badge: `${s.total} đề${s.free > 0 ? ` · ${s.free} miễn phí` : ""}` }} onPick={() => onPick(s.code)} />
            </li>
          ))}
        </ul>
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

// Lọc môn theo kỳ học: Tất cả, Kỳ 0 đến Kỳ 9, Chưa phân loại (số trong ngoặc là số môn). Kỳ chưa có môn thì mờ đi.
function SemesterTabs({ overview, value, onChange }: { overview?: LibraryOverview | null; value: string; onChange: (ky: string) => void }) {
  if (!overview) return null;
  const items = [
    { key: "", label: "Tất cả", count: overview.subjects },
    ...overview.bySemester.map((b) => ({ key: b.semester === null ? "none" : String(b.semester), label: b.semester === null ? "Chưa phân loại" : `Kỳ ${b.semester}`, count: b.subjects })),
  ];
  return (
    <div role="tablist" aria-label="Lọc môn theo kỳ" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:px-0">
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
            className={`md-state md-label-large inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 disabled:opacity-40 ${on ? "border-transparent bg-secondary-container text-on-secondary-container" : "border-outline text-on-surface"}`}
          >
            {i.label}
            <span className="text-on-surface-variant">{i.count}</span>
          </button>
        );
      })}
    </div>
  );
}
