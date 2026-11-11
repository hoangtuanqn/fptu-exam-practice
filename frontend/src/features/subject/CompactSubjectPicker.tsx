import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import type { PickableSubject } from "./SubjectPicker";

const MAX_RESULTS = 6;

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
export function CompactSubjectPicker({ subjects, loading, error, onRetry, onPick, quick = [], allHref }: Props) {
  const [q, setQ] = useState("");
  const all = subjects ?? [];
  const term = q.trim().toLowerCase();
  const matches = useMemo(() => (term ? all.filter((s) => s.code.toLowerCase().includes(term) || (s.name ?? "").toLowerCase().includes(term)) : []), [all, term]);
  const byCode = useMemo(() => new Map(all.map((s) => [s.code, s])), [all]);
  const chips = quick.map((c) => byCode.get(c)).filter((s): s is PickableSubject => !!s);

  return (
    <div className="space-y-4 px-1 py-2 sm:px-2">
      <label className="relative block">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Gõ mã môn hoặc tên môn, ví dụ PRO192"
          aria-label="Tìm môn"
          className="h-12 w-full rounded-full border border-outline-variant bg-surface-container-lowest pl-11 pr-4 text-base outline-none transition focus:border-primary"
        />
      </label>

      {loading && !subjects ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={onRetry} />
      ) : term ? (
        matches.length === 0 ? (
          <Empty icon={Search} title="Chưa có môn nào khớp">
            Thử mã môn khác, hoặc dán link FuOverflow ở tab bên cạnh để lấy đề mới.
          </Empty>
        ) : (
          <div>
            <ul className="divide-y divide-outline-variant overflow-hidden rounded-m3-md border border-outline-variant bg-surface" aria-live="polite">
              {matches.slice(0, MAX_RESULTS).map((s) => (
                <li key={s.code}>
                  <button type="button" onClick={() => onPick(s.code, s)} className="md-state flex w-full items-center gap-3 px-4 py-3 text-left">
                    <span className="md-title-small w-20 shrink-0 text-primary">{s.code}</span>
                    <span className="md-body-medium min-w-0 flex-1 truncate text-on-surface" title={s.name ?? undefined}>
                      {s.name ?? "Môn học"}
                    </span>
                    {s.badge && <Badge tone="info">{s.badge}</Badge>}
                  </button>
                </li>
              ))}
            </ul>
            {matches.length > MAX_RESULTS && <p className="md-body-small mt-2 text-on-surface-variant">Còn {matches.length - MAX_RESULTS} môn khác khớp, gõ thêm để lọc.</p>}
          </div>
        )
      ) : (
        chips.length > 0 && (
          <div>
            <p className="md-label-large mb-2 text-on-surface-variant">Chọn nhanh</p>
            <div className="flex flex-wrap gap-2">
              {chips.map((s) => (
                <button key={s.code} type="button" onClick={() => onPick(s.code, s)} title={s.name ?? undefined} className="md-state inline-flex h-9 items-center rounded-full border border-outline-variant px-4 text-sm font-medium text-on-surface">
                  {s.code}
                </button>
              ))}
            </div>
          </div>
        )
      )}

      {allHref && all.length > 0 && (
        <Link to={allHref} className="md-label-large inline-flex items-center gap-1 text-primary hover:underline">
          Xem tất cả {all.length} môn <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
