import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { Badge } from "@/shared/ui/Badge";
import { Empty, ErrorBox, Loading } from "@/shared/ui/Feedback";
import type { PickableSubject } from "./SubjectPicker";

const MAX_RESULTS = 6;

// Một môn: mã, tên và số đề. Dùng cho cả lưới chọn nhanh lẫn kết quả tìm kiếm.
function SubjectRow({ subject, onPick, tile = false }: { subject: PickableSubject; onPick: () => void; tile?: boolean }) {
  const name = subject.name ?? "Môn học";
  if (tile)
    // Ô trong lưới: mã môn, tên môn (một dòng) và số đề xếp dọc
    return (
      <button type="button" onClick={onPick} title={name} className="md-state flex h-full w-full flex-col rounded-m3-md border border-outline-variant bg-surface px-3.5 py-3 text-left transition hover:border-primary/60">
        <span className="md-title-small text-primary">{subject.code}</span>
        <span className="md-body-small mt-0.5 block w-full truncate text-on-surface-variant">{name}</span>
        {subject.badge && <span className="md-label-medium mt-1.5 text-on-surface">{subject.badge}</span>}
      </button>
    );
  return (
    <button type="button" onClick={onPick} className="md-state flex w-full items-center gap-3 px-4 py-3 text-left">
      <span className="md-title-small w-16 shrink-0 text-primary sm:w-20">{subject.code}</span>
      <span className="md-body-medium min-w-0 flex-1 truncate text-on-surface" title={name}>
        {name}
      </span>
      {subject.badge && <Badge tone="info">{subject.badge}</Badge>}
    </button>
  );
}

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
    <div className="space-y-5">
      <label className="relative block">
        <Search size={20} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-on-surface-variant" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Gõ mã môn hoặc tên môn, ví dụ PRO192"
          aria-label="Tìm môn"
          className="h-14 w-full rounded-full border border-outline-variant bg-surface-container-lowest pl-12 pr-5 text-base shadow-m3-1 outline-none transition focus:border-primary"
        />
      </label>

      {loading && !subjects ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} onRetry={onRetry} />
      ) : term ? (
        matches.length === 0 ? (
          <Empty icon={Search} title="Chưa có môn nào khớp">
            Thử mã môn khác, hoặc dán link FuOverflow ở khung bên dưới để lấy đề mới.
          </Empty>
        ) : (
          <div>
            <ul className="divide-y divide-outline-variant overflow-hidden rounded-m3-md border border-outline-variant bg-surface" aria-live="polite">
              {matches.slice(0, MAX_RESULTS).map((s) => (
                <li key={s.code}>
                  <SubjectRow subject={s} onPick={() => onPick(s.code, s)} />
                </li>
              ))}
            </ul>
            {matches.length > MAX_RESULTS && <p className="md-body-small mt-2 text-on-surface-variant">Còn {matches.length - MAX_RESULTS} môn khác khớp, gõ thêm để lọc.</p>}
          </div>
        )
      ) : (
        chips.length > 0 && (
          <div>
            <p className="md-label-large mb-2.5 text-center text-on-surface-variant">Môn có đề sẵn</p>
            <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
              {chips.map((s) => (
                <li key={s.code}>
                  <SubjectRow subject={s} tile onPick={() => onPick(s.code, s)} />
                </li>
              ))}
            </ul>
          </div>
        )
      )}

      {allHref && all.length > 0 && (
        <Link to={allHref} className="md-label-large mx-auto flex w-fit items-center gap-1 text-primary hover:underline">
          Xem tất cả {all.length} môn <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
