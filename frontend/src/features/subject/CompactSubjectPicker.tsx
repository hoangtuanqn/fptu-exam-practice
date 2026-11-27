import { memo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import { SubjectSearchInput } from "./SubjectSearchInput";
import type { PickableSubject } from "./SubjectPicker";
import { SubjectTile } from "./SubjectTile";
import { useSubjectSearch } from "./useSubjectSearch";

const MAX_RESULTS = 6;
const NONE: PickableSubject[] = [];
const NO_QUICK: string[] = [];

type Pick = (code: string, subject: PickableSubject) => void;

// Một dòng kết quả tìm kiếm: mã môn, tên môn và số đề (memo: gõ thêm phím không vẽ lại dòng vẫn còn khớp)
const SubjectRow = memo(function SubjectRow({ subject, onPick }: { subject: PickableSubject; onPick: Pick }) {
  const name = subject.name ?? "Môn học";
  return (
    <button type="button" onClick={() => onPick(subject.code, subject)} className="md-state flex w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-primary-container/30">
      <span className="md-title-small w-16 shrink-0 text-primary sm:w-20">{subject.code}</span>
      <span className="md-body-medium min-w-0 flex-1 truncate text-on-surface" title={name}>
        {name}
      </span>
      {subject.badge && <Badge tone="info">{subject.badge}</Badge>}
    </button>
  );
});

// Lưới môn gợi ý. Luôn nằm trong trang (đang tìm thì chỉ ẩn) và memo, nên gõ phím không dựng lại các ô.
// `animate` tắt sau lần tìm đầu: xoá hết chữ thì các ô hiện ngay, không chạy lại hiệu ứng.
const QuickGrid = memo(function QuickGrid({ subjects, quick, animate, onPick }: { subjects: PickableSubject[]; quick: string[]; animate: boolean; onPick: Pick }) {
  const byCode = new Map(subjects.map((s) => [s.code, s]));
  const chips = quick.map((c) => byCode.get(c)).filter((s): s is PickableSubject => !!s);
  if (chips.length === 0) return null;
  return (
    <div>
      <p className={`md-label-large mb-2.5 text-center text-on-surface-variant ${animate ? "animate-fade-in" : ""}`}>Môn có đề sẵn</p>
      <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
        {chips.map((s, i) => (
          // Ô xuất hiện lần lượt từ trái sang phải, từ trên xuống dưới
          <li key={s.code} className={animate ? "tile-in" : undefined} style={animate ? { animationDelay: `${i * 60}ms` } : undefined}>
            <SubjectTile subject={s} onPick={() => onPick(s.code, s)} />
          </li>
        ))}
      </ul>
    </div>
  );
});

interface Props {
  subjects: PickableSubject[] | undefined;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onPick: (code: string, subject: PickableSubject) => void;
  quick?: string[]; // mã môn hiện thành nút chọn nhanh khi chưa gõ tìm
  allHref?: string; // liên kết "Xem tất cả" tới trang có đủ danh sách
}

// Bộ chọn môn gọn cho trang chủ: ô tìm kiếm là chính, vài nút chọn nhanh, chỉ hiện kết quả khi người dùng gõ.
// Không bày cả trăm môn ra một lúc nên không đẩy các phần bên dưới trang chủ đi quá xa.
export function CompactSubjectPicker({ subjects, loading, error, onRetry, onPick, quick = NO_QUICK, allHref }: Props) {
  const [q, setQ] = useState("");
  const { results, term, stale } = useSubjectSearch(subjects, q);
  const searched = useRef(false);
  if (term) searched.current = true;
  const total = subjects?.length ?? 0;

  return (
    <div className="space-y-5">
      <SubjectSearchInput value={q} onChange={setQ} busy={stale} />

      {loading && !subjects ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={onRetry} />
      ) : (
        <>
          {/* Giữ chiều cao tối thiểu khi đang tìm để phần trang bên dưới không nhảy theo từng phím */}
          {term && (
            <div aria-busy={stale} className={`min-h-80 transition-opacity ${stale ? "opacity-60 delay-150" : ""}`}>
              {results.length === 0 ? (
                <Empty icon={Search} title="Chưa có môn nào khớp">
                  Thử mã môn khác.
                </Empty>
              ) : (
                <>
                  <ul className="divide-y divide-outline-variant overflow-hidden rounded-m3-md border border-outline-variant bg-surface" aria-live="polite">
                    {results.slice(0, MAX_RESULTS).map((s) => (
                      <li key={s.code}>
                        <SubjectRow subject={s} onPick={onPick} />
                      </li>
                    ))}
                  </ul>
                  {results.length > MAX_RESULTS && <p className="md-body-small mt-2 text-on-surface-variant">Còn {results.length - MAX_RESULTS} môn khác khớp, gõ thêm để lọc.</p>}
                </>
              )}
            </div>
          )}
          <div hidden={!!term}>
            <QuickGrid subjects={subjects ?? NONE} quick={quick} animate={!searched.current} onPick={onPick} />
          </div>
        </>
      )}

      {allHref && total > 0 && (
        <Link to={allHref} className="md-label-large mx-auto flex w-fit items-center gap-1 text-primary hover:underline">
          Xem tất cả {total} môn <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
