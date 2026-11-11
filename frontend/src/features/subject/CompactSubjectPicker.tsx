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
  return (
    <button type="button" onClick={onPick} className={`md-state flex w-full items-center gap-3 px-4 py-3 text-left ${tile ? "rounded-m3-md border border-outline-variant bg-surface" : ""}`}>
      {tile ? (
        // Ô trong lưới hẹp: mã môn nằm trên tên môn để tên có đủ chỗ
        <span className="min-w-0 flex-1">
          <span className="md-title-small block text-primary">{subject.code}</span>
          <span className="md-body-small block truncate text-on-surface-variant" title={name}>
            {name}
          </span>
        </span>
      ) : (
        <>
          <span className="md-title-small w-16 shrink-0 text-primary sm:w-20">{subject.code}</span>
          <span className="md-body-medium min-w-0 flex-1 truncate text-on-surface" title={name}>
            {name}
          </span>
        </>
      )}
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
            <p className="md-label-large mb-2 text-on-surface-variant">Môn có đề sẵn</p>
            <ul className="grid gap-2 sm:grid-cols-2">
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
        <Link to={allHref} className="md-label-large inline-flex items-center gap-1 text-primary hover:underline">
          Xem tất cả {all.length} môn <ArrowRight size={15} />
        </Link>
      )}
    </div>
  );
}
