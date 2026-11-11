import { useEffect, useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
import { SubjectSearchInput } from "@/features/subject/SubjectSearchInput";
import { SubjectTile } from "@/features/subject/SubjectTile";
import { Button } from "@/shared/ui/Button";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { Segmented } from "@/shared/ui/Segmented";
import type { SubjectsQuery } from "./PublicSubjectBrowser";

const STEP = 24; // mỗi lần hiện thêm bấy nhiêu môn

type Sort = "most" | "az";

// Toàn bộ môn của Kho đề công khai: tìm theo mã hoặc tên, sắp theo số đề hay theo mã, hiện từng đợt (không cắt bớt, luôn nói rõ đang hiện bao nhiêu trên tổng).
export function CatalogOverview({ subjects, onPick }: { subjects: SubjectsQuery; onPick: (code: string) => void }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("most");
  const [limit, setLimit] = useState(STEP);
  useEffect(() => setLimit(STEP), [q, sort]); // đổi tìm kiếm hay cách sắp thì về đợt đầu

  const all = subjects.data;
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const found = (all ?? []).filter((s) => !term || s.code.toLowerCase().includes(term) || (s.name ?? "").toLowerCase().includes(term));
    return sort === "az" ? [...found].sort((a, b) => a.code.localeCompare(b.code)) : found; // dữ liệu từ máy chủ đã xếp theo số đề
  }, [all, q, sort]);

  if (subjects.loading && !all) return <Loading />;
  if (subjects.error) return <ErrorBox message={subjects.error} onRetry={subjects.reload} />;

  const shown = list.slice(0, limit);
  const rest = list.length - shown.length;

  return (
    <div className="space-y-5">
      <SubjectSearchInput value={q} onChange={setQ} />

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
              <SubjectTile subject={{ code: s.code, name: s.name, badge: `${s.total} đề` }} onPick={() => onPick(s.code)} />
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
