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
      <button
        type="button"
        onClick={onPick}
        title={name}
        className="md-state group relative flex h-full w-full flex-col overflow-hidden rounded-m3-md border border-outline-variant/70 bg-gradient-to-b from-surface-container-lowest to-surface-container-low px-3.5 py-3 text-left shadow-[0_1px_2px_rgba(0,0,0,0.04),0_10px_22px_-14px_rgba(70,45,0,0.35)] transition duration-200 hover:-translate-y-0.5 hover:border-[#e0a100]/70 hover:shadow-[0_1px_2px_rgba(0,0,0,0.05),0_16px_28px_-14px_rgba(160,100,0,0.5)]"
      >
        <span aria-hidden className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#ffc61f]/60 to-transparent" />
        <span className="md-title-small text-primary">{subject.code}</span>
        <span className="md-body-small mt-0.5 block w-full truncate text-on-surface-variant">{name}</span>
        {subject.badge && <span className="md-label-medium mt-2 inline-flex w-fit rounded-full bg-primary-container/70 px-2.5 py-0.5 text-on-primary-container">{subject.badge}</span>}
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
        <span aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-gradient-to-b from-[#ffe58a] via-[#ffc61f] to-[#e89a00] text-[#3a2600] shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_6px_14px_-6px_rgba(240,168,0,0.7)]">
          <Search size={18} strokeWidth={2.4} />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Gõ mã môn hoặc tên môn, ví dụ PRO192"
          aria-label="Tìm môn"
          className="h-14 w-full rounded-full border border-outline-variant/80 bg-gradient-to-b from-surface-container-lowest to-surface-container-low pl-16 pr-5 text-base shadow-[0_1px_2px_rgba(0,0,0,0.05),0_14px_30px_-16px_rgba(70,45,0,0.45)] outline-none transition placeholder:text-on-surface-variant focus:border-[#e0a100] focus:shadow-[0_0_0_4px_rgba(255,198,31,0.22),0_14px_30px_-16px_rgba(70,45,0,0.45)]"
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
